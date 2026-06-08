"use client";

import React, { useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function RegisterWargaPage() {
  const [nik, setNik] = useState("");
  const [token, setToken] = useState("");
  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");

  // UI state
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!nik || !token || !nama || !email || !phone || !password) {
      setErrorMsg("Harap isi semua kolom wajib yang bertanda bintang (*).");
      return;
    }

    if (nik.length !== 16 || !/^\d+$/.test(nik)) {
      setErrorMsg("NIK harus berupa 16 digit angka.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/warga-register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nik: nik,
          token: token,
          nama: nama,
          username: username || email,
          email: email,
          phone_number: phone,
          password: password,
          address: address,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg("Pendaftaran Warga RT berhasil! Anda akan dialihkan ke halaman utama untuk masuk.");
        setTimeout(() => {
          window.location.href = "/?registered=warga";
        }, 3000);
      } else {
        let errMsg = "";
        for (const key in data) {
          if (Array.isArray(data[key])) {
            errMsg += `${key}: ${data[key].join(" ")} `;
          } else {
            errMsg += `${key}: ${data[key]} `;
          }
        }
        setErrorMsg(errMsg || "Gagal melakukan pendaftaran warga.");
      }
    } catch (err) {
      setErrorMsg("Koneksi ke server backend gagal. Pastikan server Django berjalan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-2xl bg-[#f0f4f8] rounded-[30px] p-8 md:p-12 nm-flat border border-white/60 relative animate-fade-in-up">
        {/* Decorative circle highlights */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-blue/5 rounded-full blur-3xl"></div>

        {/* Back Button */}
        <button
          onClick={() => (window.location.href = "/")}
          className="mb-8 px-4 py-2 rounded-xl text-xs font-bold bg-[#f0f4f8] nm-button text-brand-navy flex items-center gap-2"
        >
          <span>🏠</span> Kembali Ke Beranda
        </button>

        {/* Title Block */}
        <div className="text-center mb-10">
          <span className="text-5xl block mb-3">👥</span>
          <h1 className="text-3xl font-black tracking-tight text-brand-navy">
            Registrasi Akun Warga Kope<span className="text-brand-orange">RT</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-2 max-w-md mx-auto leading-relaxed">
            Pendaftaran khusus untuk Warga RT 04 yang telah terdata NIK-nya oleh Ketua RT. Hubungi Ketua RT untuk mendapatkan Token Registrasi unik Anda.
          </p>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-2xl mb-6 text-xs font-bold flex gap-2.5 animate-bounce">
            <span>⚠️</span> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-800 p-4 rounded-2xl mb-6 text-xs font-bold flex gap-2.5 animate-bounce">
            <span>✅</span> {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          {/* STEP 1: VERIFICATION DATA */}
          <div className="border-b border-zinc-200/50 pb-5">
            <h3 className="text-xs font-black text-brand-orange uppercase tracking-wider mb-4">Langkah 1: Verifikasi Kependudukan RT</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                  Nomor Induk Kependudukan (NIK) *
                </label>
                <input
                  type="text"
                  maxLength={16}
                  placeholder="16 digit angka NIK..."
                  value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
                  required
                  className="w-full px-4 py-3.5 rounded-xl text-xs nm-input text-brand-navy font-bold tracking-wider"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                  Token Registrasi (Didapat dari RT) *
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="Masukkan token unik..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl text-xs nm-input text-brand-navy font-bold uppercase tracking-widest"
                />
              </div>
            </div>
          </div>

          {/* STEP 2: PROFILE DATA */}
          <div>
            <h3 className="text-xs font-black text-brand-blue uppercase tracking-wider mb-4">Langkah 2: Data Akun Baru</h3>
            
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                    Nama Lengkap Warga *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pak Joko Widodo"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 rounded-xl text-xs nm-input text-brand-navy font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                    Nomor Telepon Aktif *
                  </label>
                  <input
                    type="tel"
                    placeholder="Contoh: 0812xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 rounded-xl text-xs nm-input text-brand-navy font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                    Alamat Email Warga *
                  </label>
                  <input
                    type="email"
                    placeholder="Contoh: warga@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 rounded-xl text-xs nm-input text-brand-navy"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                    Username Akun (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Biarkan kosong untuk samakan dengan email..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl text-xs nm-input text-brand-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                    Kata Sandi Akun *
                  </label>
                  <input
                    type="password"
                    placeholder="Masukkan sandi minimal 6 karakter..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 rounded-xl text-xs nm-input text-brand-navy"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                    Alamat Rumah di RT (No. Rumah)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Rumah No. 42A, RT 04 / RW 02"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl text-xs nm-input text-brand-navy"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 rounded-2xl text-xs font-black text-white bg-brand-blue hover:bg-brand-blue-light shadow-lg transition text-center uppercase tracking-widest mt-4 ${
              isSubmitting ? "opacity-55 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Sedang Mendaftarkan..." : "Daftarkan Akun Warga Baru 🚀"}
          </button>

        </form>
      </div>
    </div>
  );
}
