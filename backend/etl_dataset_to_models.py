import re
import argparse
import os
from typing import List


def find_dataset_inserts(sql_text: str) -> List[str]:
    """Return list of VALUES blocks for INSERT INTO `dataset` statements."""
    pattern = re.compile(r"INSERT INTO `dataset`.*?VALUES\s*(.*?);", re.IGNORECASE | re.DOTALL)
    matches = pattern.findall(sql_text)
    return matches


def split_top_level_tuples(values_block: str) -> List[str]:
    """Split the VALUES (...) , (...) block into individual tuple strings."""
    tuples = []
    depth = 0
    start = None
    for i, ch in enumerate(values_block):
        if ch == '(':
            if depth == 0:
                start = i
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0 and start is not None:
                tuples.append(values_block[start + 1:i])
                start = None
    return tuples


def split_fields(tuple_body: str) -> List[str]:
    """Split fields in a SQL tuple body by commas not inside single quotes."""
    fields = []
    cur = []
    in_quote = False
    i = 0
    while i < len(tuple_body):
        ch = tuple_body[i]
        if ch == "'":
            # handle escaped single quote '' inside SQL
            cur.append(ch)
            i += 1
            while i < len(tuple_body):
                cur.append(tuple_body[i])
                if tuple_body[i] == "'":
                    # check if next char is also a quote (escaped)
                    if i + 1 < len(tuple_body) and tuple_body[i + 1] == "'":
                        cur.append("'")
                        i += 2
                        continue
                    else:
                        i += 1
                        break
                i += 1
            continue
        if ch == ',' and not in_quote:
            fields.append(''.join(cur).strip())
            cur = []
            i += 1
            continue
        cur.append(ch)
        i += 1
    if cur:
        fields.append(''.join(cur).strip())
    return fields


def unquote_sql_string(s: str) -> str:
    s = s.strip()
    if s.startswith("'") and s.endswith("'"):
        inner = s[1:-1]
        # replace doubled single quotes with single quote
        return inner.replace("''", "'")
    return s


def parse_dataset_sql(path: str):
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()

    values_blocks = find_dataset_inserts(text)
    tuples = []
    for block in values_blocks:
        tuples += split_top_level_tuples(block)

    # Convert tuple bodies to lists of fields
    rows = []
    for t in tuples:
        fields = split_fields(t)
        fields = [unquote_sql_string(f) for f in fields]
        rows.append(fields)

    return rows


def etl_preview(path: str, limit: int = 5):
    rows = parse_dataset_sql(path)
    if not rows:
        print('No dataset rows found in SQL file.')
        return

    # first row may be header
    header = rows[0]
    data_rows = rows[1:]
    print(f'Found {len(data_rows)} data rows in `dataset`. Header columns: {len(header)}')
    print('Header sample:', header)
    print('\nSample rows:')
    for r in data_rows[:limit]:
        print(' -', r)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', '-f', default=os.path.join('..', 'smart_tourism_system.sql'))
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()

    path = args.file
    if not os.path.exists(path):
        print('SQL file not found:', path)
        return

    rows = parse_dataset_sql(path)
    if not rows:
        print('No dataset rows parsed.')
        return

    header = rows[0]
    data_rows = rows[1:]
    print(f'Parsed {len(data_rows)} data rows.')

    if not args.apply:
        etl_preview(path)
        print('\nRun with --apply to insert into the application DB (uses backend/__init__.py config).')
        return

    # APPLY: insert into ORM
    from __init__ import app, db
    from models import City, Category, Shop

    with app.app_context():
        created = 0
        skipped = 0
        for i, r in enumerate(data_rows):
            # Expect columns: item_name, shop_name, city, address, price, rating, category, lat, lon
            try:
                item_name = r[0]
                shop_name = r[1]
                city_name = r[2]
                address = r[3]
                price = r[4]
                rating = float(r[5]) if r[5] else None
                category_name = r[6]
                lat = float(r[7]) if r[7] else None
                lon = float(r[8]) if r[8] else None
            except Exception:
                print(f'Skipping malformed row #{i}:', r)
                skipped += 1
                continue

            # Get or create city
            city = City.query.filter_by(name=city_name).first()
            if not city:
                city = City(name=city_name)
                db.session.add(city)
                db.session.commit()

            # Get or create category
            category = None
            if category_name:
                category = Category.query.filter_by(name=category_name).first()
                if not category:
                    # Category in dump may be numeric id; store as string if so
                    category = Category(name=category_name)
                    db.session.add(category)
                    db.session.commit()

            # Skip if shop exists
            existing = Shop.query.filter_by(shop_name=shop_name, address=address).first()
            if existing:
                skipped += 1
                continue

            s = Shop(
                shop_name=shop_name,
                address=address,
                items=item_name,
                price=price,
                rating=rating or 0,
                lat=lat or 0,
                lon=lon or 0,
                city_id=city.id,
                category_id=category.id if category else (1 if hasattr(Category, 'id') else None)
            )
            db.session.add(s)
            created += 1

            if created % 100 == 0:
                db.session.commit()

        db.session.commit()
        print(f'ETL complete. Created: {created}, Skipped: {skipped}')


if __name__ == '__main__':
    main()
