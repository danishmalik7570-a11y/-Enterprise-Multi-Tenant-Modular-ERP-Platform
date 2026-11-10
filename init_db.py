import psycopg2

def init_db():
    conn = psycopg2.connect(dbname="postgres", user="postgres", host="127.0.0.1", port=5432)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = 'generic_erp'")
    if not cur.fetchone():
        cur.execute("CREATE DATABASE generic_erp;")
        print("Database 'generic_erp' created successfully.")
    else:
        print("Database 'generic_erp' already exists.")
    cur.close()
    conn.close()

if __name__ == "__main__":
    init_db()
