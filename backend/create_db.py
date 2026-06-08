import sys
import MySQLdb

def main():
    print("Mencoba menghubungkan ke server MySQL lokal...")
    try:
        # Default Laragon MySQL connection settings
        conn = MySQLdb.connect(
            host="127.0.0.1",
            user="root",
            passwd="",
            port=3306
        )
        cursor = conn.cursor()
        
        # Create database
        db_name = "koperasi_rt"
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        print(f"Berhasil: Database '{db_name}' telah dibuat atau sudah ada.")
        
        cursor.close()
        conn.close()
    except MySQLdb.OperationalError as e:
        print("\nGagal Menghubungkan ke MySQL!", file=sys.stderr)
        print("Detail Error:", e, file=sys.stderr)
        print("\nSilakan pastikan bahwa Laragon telah dijalankan dan service MySQL telah dimulai (klik 'Start All' di Laragon).", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\nError tidak terduga: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
