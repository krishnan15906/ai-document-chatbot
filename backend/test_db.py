import psycopg2
passwords=['admin', 'postgres', 'Admin@123', 'admin@123', 'root', '1234', 'password']
success=False
for p in passwords:
    try:
        psycopg2.connect(host='127.0.0.1', port=5432, user='postgres', password=p, dbname='postgres')
        print('SUCCESS password is:', p)
        success=True
        break
    except Exception as e:
        pass
if not success: print('ALL FAILED')
