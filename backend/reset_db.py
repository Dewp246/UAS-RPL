import sys
import MySQLdb

def main():
    print("Menghubungkan ke MySQL server untuk melakukan reset database...")
    try:
        conn = MySQLdb.connect(
            host="127.0.0.1",
            user="root",
            passwd="",
            port=3306
        )
        cursor = conn.cursor()
        
        db_name = "koperasi_rt"
        
        # Drop database
        print(f"Menghapus database '{db_name}'...")
        cursor.execute(f"DROP DATABASE IF EXISTS {db_name};")
        
        # Create database
        print(f"Membuat ulang database '{db_name}'...")
        cursor.execute(f"CREATE DATABASE {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        
        print(f"Berhasil: Database '{db_name}' telah di-reset.")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Gagal melakukan reset database: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
