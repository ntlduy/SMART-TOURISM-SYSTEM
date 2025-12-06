import re
import argparse
import os
from sqlalchemy import text

# This script provides a safe preview of a large SQL dump and an optional
# apply mode that executes statements against the Flask app's configured DB.
# Usage:
#   python sql_importer.py --file ../smart_tourism_system.sql
#   python sql_importer.py --file ../smart_tourism_system.sql --apply


def analyze_sql(path):
    stats = {'create_tables': {}, 'insert_counts': {}, 'total_statements': 0}
    create_re = re.compile(r"CREATE TABLE `([^`]+)`", re.IGNORECASE)
    insert_re = re.compile(r"INSERT INTO `([^`]+)`", re.IGNORECASE)

    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    # crude split by semicolon for statement counting
    statements = [s.strip() for s in content.split(';') if s.strip()]
    stats['total_statements'] = len(statements)

    for m in create_re.finditer(content):
        name = m.group(1)
        stats['create_tables'][name] = stats['create_tables'].get(name, 0) + 1

    for m in insert_re.finditer(content):
        name = m.group(1)
        stats['insert_counts'][name] = stats['insert_counts'].get(name, 0) + 1

    return stats, content


def apply_sql(path, content):
    # Import Flask app/db lazily to avoid side-effects when only previewing
    from __init__ import app, db
    from sqlalchemy import text

    with app.app_context():
        conn = db.engine.connect()
        trans = conn.begin()
        try:
            # Split on semicolons — this is best-effort for dumps created by mysqldump
            stmts = [s.strip() for s in content.split(';') if s.strip()]
            executed = 0
            for stmt in stmts:
                # Skip DEFINER/DELIMITER style statements (keep safe)
                low = stmt.lower()
                if low.startswith('set ') or low.startswith('/*!') or low.startswith('drop database'):
                    continue
                conn.execute(text(stmt))
                executed += 1

            trans.commit()
            print(f"Applied {executed} statements to database.")
        except Exception as ex:
            trans.rollback()
            print('Error while applying SQL:')
            print(str(ex))
            raise
        finally:
            conn.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', '-f', required=False, default=os.path.join('..', 'smart_tourism_system.sql'))
    parser.add_argument('--apply', action='store_true', help='Actually execute statements against configured DB')
    args = parser.parse_args()

    path = args.file
    if not os.path.exists(path):
        print(f"SQL file not found: {path}")
        return

    print(f"Analyzing SQL file: {path}")
    stats, content = analyze_sql(path)

    print('\nSummary:')
    print(f"  Total statements (approx): {stats['total_statements']}")
    print(f"  CREATE TABLE found: {len(stats['create_tables'])}")
    if stats['create_tables']:
        print('    ' + ', '.join(list(stats['create_tables'].keys())[:20]))
    print(f"  INSERT INTO table names (unique): {len(stats['insert_counts'])}")
    if stats['insert_counts']:
        sample = list(stats['insert_counts'].items())[:20]
        for t, c in sample:
            print(f"    {t}: {c} matches")

    if args.apply:
        confirm = input('\nYou passed --apply. This will execute statements on the database configured in backend/__init__.py. Continue? [y/N]: ')
        if confirm.lower() == 'y':
            apply_sql(path, content)
        else:
            print('Aborted by user.')


if __name__ == '__main__':
    main()
