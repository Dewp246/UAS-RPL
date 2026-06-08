import os
import django

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'koperasi_backend.settings')
    django.setup()

    from django.contrib.auth import get_user_model
    User = get_user_model()

    username = 'admin'
    email = 'admin@koperasi.com'
    password = 'adminpassword'
    nama = 'Pengurus Koperasi'
    phone_number = '081234567890'
    address = 'Kantor Koperasi RT 04'

    if not User.objects.filter(username=username).exists():
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            nama=nama,
            phone_number=phone_number,
            address=address,
            role='admin'
        )
        print("Berhasil: Superuser 'admin' telah dibuat dengan password 'adminpassword'")
    else:
        print("Info: Superuser 'admin' sudah ada di database.")

if __name__ == "__main__":
    main()
