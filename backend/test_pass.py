import psycopg2
users=['postgres', 'admin', 'root', 'Krishna', 'Krishna patel']
passwords=['12345@Kp', 'admin@123', 'Admin@123', 'postgres']
for u in users:
    for p in passwords:
        try:
            psycopg2.connect(host='127.0.0.1', port=5432, user=u, password=p, dbname='postgres')
            print('SUCCESS user:', u, 'password:', p)
        except Exception as e:
            pass
