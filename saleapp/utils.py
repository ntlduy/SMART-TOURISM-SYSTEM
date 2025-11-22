import hashlib
from __init__ import app, db
from models import  User, Shop





def add_user(name, username, password, **kwargs):
    password = str(hashlib.md5(password.strip().encode('utf-8')).hexdigest())
    user = User(name=name.strip(), username=username.strip(),password=password,
                email=kwargs.get('email'),
                avatar=kwargs.get('avatar'))
                
    db.session.add(user)
    db.session.commit()

def check_login(username, password):
    if username and password:
        password = str(hashlib.md5(password.strip().encode('utf-8')).hexdigest())
        return User.query.filter(User.username.__eq__(username.strip()),
                                 User.password.__eq__(password)).first()
    return None


def get_user_by_id(user_id):
    return User.query.get(user_id)



def load_shops(kw=None, from_price=None, to_price=None, page=1):
    shops = Shop.query
    
    if kw:
        from sqlalchemy import or_
        shops = shops.filter(or_(
            Shop.shop_name.contains(kw),
            Shop.items.contains(kw)
        ))
    

    page_size = app.config['PAGE_SIZE']
    start = (page - 1) * page_size
    end = start + page_size
    
    return shops.slice(start, end).all()

def count_shops():
    return Shop.query.count()

