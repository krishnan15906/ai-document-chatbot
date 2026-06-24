import psycopg2
users=['postgres', 'Krishna', 'Krishna patel', 'admin', 'root']
for u in users:
    try:
        psycopg2.connect(host='127.0.0.1', port=5432, user=u, password='admin@123', dbname='postgres')
        print('SUCCESS user is:', u)
    except Exception as e:
        print(u, str(e).strip())
