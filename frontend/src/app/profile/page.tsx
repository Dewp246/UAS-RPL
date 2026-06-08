"use client";

import React, { useState, useEffect } from "react";
import Script from "next/script";

const API_BASE_URL = "http://127.0.0.1:8000";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  nama: string;
  phone_number: string;
  address: string | null;
  role: "guest" | "user" | "warga" | "admin";
  nik?: string;
  date_of_birth: string | null;
  gender: "L" | "P" | null;
  points: number;
  stamps: number;
  member_tier: "silver" | "gold" | "platinum";
  has_pin: boolean;
}

interface Address {
  id: number;
  label: string;
  recipient_name: string;
  phone_number: string;
  full_address: string;
  is_default: boolean;
}

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [activeTab, setActiveTab] = useState<"personal" | "addresses" | "security" | "help">("personal");
  const [isClient, setIsClient] = useState(false);

  // Status Notification Toast
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Edit Profile form states
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editGender, setEditGender] = useState<"L" | "P" | "">("");

  // Address modal states
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addrLabel, setAddrLabel] = useState("");
  const [addrRecipient, setAddrRecipient] = useState("");
  const [addrPhone, setAddrPhone] = useState("");
  const [addrFull, setAddrFull] = useState("");
  const [addrIsDefault, setAddrIsDefault] = useState(false);

  // Security Form states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // Accordion FAQ states
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Load cached profile instantly to prevent guest UI flicker
    const cachedUser = sessionStorage.getItem("user_profile");
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        setCurrentUser(parsed);
        setEditName(parsed.nama);
        setEditPhone(parsed.phone_number);
        setEditDob(parsed.date_of_birth || "");
        setEditGender(parsed.gender || "");
      } catch (e) {
        console.error("Gagal memuat profil cache:", e);
      }
    }

    const token = sessionStorage.getItem("access_token");
    if (!token) {
      // Redirect to home if not logged in
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
      return;
    }
    fetchProfile(token);
    fetchAddresses(token);
  }, []);

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me/`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
        sessionStorage.setItem("user_profile", JSON.stringify(data));
        // Set profile form states
        setEditName(data.nama);
        setEditPhone(data.phone_number);
        setEditDob(data.date_of_birth || "");
        setEditGender(data.gender || "");
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error("Gagal memuat profil:", err);
    }
  };

  const fetchAddresses = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile/addresses/`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
      }
    } catch (err) {
      console.error("Gagal mengambil buku alamat:", err);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("user_profile");
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    if (type === "success") {
      setSuccessMsg(message);
      setTimeout(() => setSuccessMsg(""), 3000);
    } else {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  // Update Profile Info
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile/update/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          nama: editName,
          phone_number: editPhone,
          date_of_birth: editDob || null,
          gender: editGender || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        sessionStorage.setItem("user_profile", JSON.stringify(data.user));
        showNotification("success", "Profil Anda berhasil diperbarui!");
      } else {
        let errStr = "";
        for (const key in data) {
          errStr += `${key}: ${data[key].join(" ")} `;
        }
        showNotification("error", errStr || "Gagal memperbarui profil.");
      }
    } catch (err) {
      showNotification("error", "Koneksi gagal.");
    }
  };

  // Add Address
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile/addresses/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          label: addrLabel,
          recipient_name: addrRecipient,
          phone_number: addrPhone,
          full_address: addrFull,
          is_default: addrIsDefault
        })
      });

      if (res.ok) {
        showNotification("success", "Alamat baru berhasil ditambahkan!");
        setShowAddressModal(false);
        fetchAddresses(token);
        // Reset Address form
        setAddrLabel("");
        setAddrRecipient("");
        setAddrPhone("");
        setAddrFull("");
        setAddrIsDefault(false);
      } else {
        const data = await res.json();
        showNotification("error", "Gagal menambahkan alamat. Pastikan data terisi lengkap.");
      }
    } catch (err) {
      showNotification("error", "Koneksi gagal.");
    }
  };

  // Delete Address
  const handleDeleteAddress = async (id: number) => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;
    if (!confirm("Apakah Anda yakin ingin menghapus alamat ini?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile/addresses/${id}/`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        showNotification("success", "Alamat berhasil dihapus.");
        fetchAddresses(token);
      } else {
        showNotification("error", "Gagal menghapus alamat.");
      }
    } catch (err) {
      showNotification("error", "Koneksi gagal.");
    }
  };

  // Set Address as default
  const handleSetDefaultAddress = async (id: number) => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile/addresses/${id}/set-default/`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        showNotification("success", "Alamat utama berhasil diubah.");
        fetchAddresses(token);
      } else {
        showNotification("error", "Gagal memperbarui alamat utama.");
      }
    } catch (err) {
      showNotification("error", "Koneksi gagal.");
    }
  };

  // Change Password Submit
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showNotification("error", "Konfirmasi kata sandi tidak cocok.");
      return;
    }
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile/change-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        showNotification("success", "Kata sandi Anda berhasil diperbarui!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        let errStr = "";
        for (const key in data) {
          errStr += `${key}: ${data[key].join(" ")} `;
        }
        showNotification("error", errStr || "Gagal mengubah sandi.");
      }
    } catch (err) {
      showNotification("error", "Koneksi gagal.");
    }
  };

  // Change PIN Submit
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      showNotification("error", "Konfirmasi PIN tidak cocok.");
      return;
    }
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      showNotification("error", "PIN baru harus berupa 6 digit angka.");
      return;
    }
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile/change-pin/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          old_pin: oldPin,
          new_pin: newPin
        })
      });

      const data = await res.json();
      if (res.ok) {
        showNotification("success", "PIN transaksi Anda berhasil disimpan!");
        setOldPin("");
        setNewPin("");
        setConfirmPin("");
        fetchProfile(token);
      } else {
        let errStr = "";
        for (const key in data) {
          errStr += `${key}: ${data[key].join(" ")} `;
        }
        showNotification("error", errStr || "Gagal mengubah PIN.");
      }
    } catch (err) {
      showNotification("error", "Koneksi gagal.");
    }
  };

  if (!isClient || !currentUser) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center font-sans">
        <div className="text-center">
          <span className="text-5xl block animate-spin mb-4">🔄</span>
          <p className="text-zinc-500 font-bold text-sm">Memuat profil warga...</p>
        </div>
      </div>
    );
  }

  // Barcode / Member Tier Visual Theme Config
  const tierThemes = {
    silver: {
      bg: "bg-gradient-to-br from-zinc-300 via-zinc-200 to-zinc-400",
      text: "text-zinc-800",
      badge: "bg-zinc-800 text-zinc-100",
      name: "Silver Member"
    },
    gold: {
      bg: "bg-gradient-to-br from-yellow-300 via-yellow-100 to-amber-500 animate-pulse",
      text: "text-amber-950",
      badge: "bg-amber-950 text-yellow-100",
      name: "Gold Member"
    },
    platinum: {
      bg: "bg-gradient-to-br from-slate-800 via-slate-700 to-slate-950 border border-slate-700/50 shadow-2xl",
      text: "text-slate-100",
      badge: "bg-yellow-400 text-slate-900 font-black",
      name: "Platinum Member"
    }
  };

  const theme = tierThemes[currentUser.member_tier] || tierThemes.silver;

  return (
    <div className="min-h-screen bg-brand-navy-light/5 text-brand-navy flex flex-col font-sans">
      
      {/* Toast Notification Messages */}
      {successMsg && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg z-50 text-xs font-bold flex items-center gap-2 animate-bounce">
          <span>✅</span> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg z-50 text-xs font-bold flex items-center gap-2 animate-bounce">
          <span>⚠️</span> {errorMsg}
        </div>
      )}

      {/* Profile Header Navbar */}
      <header className="sticky top-0 bg-[#f0f4f8]/90 backdrop-blur-md z-40 py-4 px-6 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👤</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-brand-navy">
                Profil Warga Kope<span className="text-brand-orange">RT</span>
              </h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Pengaturan Akun & A-Member</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = "/"}
            className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#f0f4f8] nm-button text-brand-navy"
          >
            🏠 Kembali Ke Toko
          </button>
        </div>
      </header>

      {/* Profile Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: member card & statistics */}
        <div className="flex flex-col gap-8">
          {/* Card Digital Member (A-Member) - Only for Warga */}
          {currentUser.role === 'warga' && (
            <div className={`rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between aspect-[1.6/1] ${theme.bg} ${theme.text} shadow-xl animate-fade-in`}>
              {/* Glossy Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none"></div>

              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black tracking-wide">KopeRT Member</h3>
                  <p className="text-[9px] opacity-75 uppercase tracking-widest font-bold">Kartu Anggota Digital</p>
                </div>
                <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wider ${theme.badge}`}>
                  {theme.name}
                </span>
              </div>

              {/* Simulated Barcode */}
              <div className="my-2 bg-white/70 p-3 rounded-lg border border-black/5 flex flex-col items-center gap-1">
                {/* Barcode Lines */}
                <div className="h-6 w-full flex items-center justify-center gap-[1px]">
                  {Array.from({ length: 42 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="bg-zinc-950 h-full"
                      style={{ width: `${(i % 3 === 0 ? 3 : i % 5 === 0 ? 1 : 2)}px` }}
                    ></div>
                  ))}
                </div>
                <span className="text-[8px] font-mono text-zinc-800 tracking-[0.25em] font-semibold uppercase">
                  {currentUser.username.substring(0, 16)}
                </span>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] opacity-75 font-semibold">Nama Anggota</p>
                  <h4 className="text-sm font-black truncate max-w-[180px]">{currentUser.nama}</h4>
                </div>
                <div className="text-right">
                  <p className="text-[10px] opacity-75 font-semibold">Tingkat</p>
                  <h4 className="text-sm font-black capitalize">{currentUser.member_tier}</h4>
                </div>
              </div>
            </div>
          )}

          {/* Member Points & Stamps Widget - Only for Warga */}
          {currentUser.role === 'warga' && (
            <div className="p-6 rounded-3xl bg-white nm-flat border border-white/50 grid grid-cols-2 gap-4 animate-fade-in">
              <div className="text-center p-3 rounded-2xl bg-zinc-50/50 border border-zinc-100 flex flex-col items-center">
                <span className="text-3xl mb-1">⭐</span>
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">A-Poin</span>
                <h4 className="text-xl font-black text-brand-blue">{currentUser.points} Pts</h4>
                <p className="text-[8px] text-zinc-400 mt-1">Rp 10rb Lunas = 1 Poin</p>
              </div>

              <div className="text-center p-3 rounded-2xl bg-zinc-50/50 border border-zinc-100 flex flex-col items-center">
                <span className="text-3xl mb-1">🎟️</span>
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Stamp</span>
                <h4 className="text-xl font-black text-brand-orange">{currentUser.stamps} Stamps</h4>
                <p className="text-[8px] text-zinc-400 mt-1">Rp 50rb Lunas = 1 Stamp</p>
              </div>
            </div>
          )}

          {/* Profile Sidebar Menu Navigation */}
          <div className="p-4 rounded-3xl bg-white nm-flat border border-white/50 flex flex-col gap-2">
            {[
              { id: "personal", label: "👤 Akun & Data Pribadi" },
              { id: "addresses", label: "🏡 Buku Alamat Pengiriman" },
              currentUser.role === 'warga' && { id: "security", label: "🔒 Keamanan & PIN COD" },
              { id: "help", label: "❓ Pusat Bantuan & Syarat" }
            ].filter(Boolean).map((tab: any) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className={`w-full py-3.5 px-4 rounded-2xl text-left text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-brand-blue text-white shadow-inner"
                    : "bg-white text-brand-navy hover:bg-zinc-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button 
              onClick={handleLogout}
              className="w-full py-3.5 px-4 rounded-2xl text-left text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100/50 transition-colors"
            >
              🚪 Keluar Akun Warga
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: dynamic tab panels */}
        <div className="lg:col-span-2">
          
          {/* TAB 1: PERSONAL INFO */}
          {activeTab === "personal" && (
            <div className="p-8 rounded-3xl nm-flat bg-white border border-white/60 flex flex-col gap-6 animate-fade-in-up">
              <div>
                <h3 className="text-xl font-black text-brand-navy">Informasi Akun & Data Pribadi</h3>
                <p className="text-xs text-zinc-400 mt-1">Kelola informasi profil lengkap anggota koperasi</p>
              </div>

              <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Nama Lengkap</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl text-xs nm-input text-brand-navy"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Nomor Handphone</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl text-xs nm-input text-brand-navy"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Email (Username)</label>
                    <input
                      type="email"
                      value={currentUser.email}
                      disabled
                      className="w-full px-4 py-3 rounded-xl text-xs nm-input text-zinc-400 bg-zinc-50 cursor-not-allowed opacity-75"
                    />
                    <span className="text-[9px] text-zinc-400 mt-1 block">Email tidak dapat diubah</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={editDob}
                      onChange={(e) => setEditDob(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-xs nm-input text-brand-navy"
                    />
                  </div>
                </div>

                {currentUser.role === 'warga' && (
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Nomor Induk Kependudukan (NIK)</label>
                    <input
                      type="text"
                      value={currentUser.nik || ""}
                      disabled
                      className="w-full px-4 py-3 rounded-xl text-xs nm-input text-zinc-400 bg-zinc-50 cursor-not-allowed opacity-75 tracking-wider font-bold"
                    />
                    <span className="text-[9px] text-zinc-400 mt-1 block">NIK terverifikasi RT secara offline dan tidak dapat diubah</span>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">Jenis Kelamin</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-brand-navy">
                      <input
                        type="radio"
                        name="gender"
                        value="L"
                        checked={editGender === "L"}
                        onChange={() => setEditGender("L")}
                        className="accent-brand-blue"
                      />
                      Laki-laki
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-brand-navy">
                      <input
                        type="radio"
                        name="gender"
                        value="P"
                        checked={editGender === "P"}
                        onChange={() => setEditGender("P")}
                        className="accent-brand-blue"
                      />
                      Perempuan
                    </label>
                  </div>
                </div>

                <div className="mt-4 border-t border-zinc-100 pt-5">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-brand-orange hover:bg-brand-orange-light shadow-md transition"
                  >
                    Simpan Perubahan Data 💾
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: ADDRESS BOOK */}
          {activeTab === "addresses" && (
            <div className="p-8 rounded-3xl nm-flat bg-white border border-white/60 flex flex-col gap-6 animate-fade-in-up">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-brand-navy">Buku Alamat Pengiriman</h3>
                  <p className="text-xs text-zinc-400 mt-1">Daftar alamat tersimpan untuk memudahkan pengiriman instan</p>
                </div>
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-blue text-white shadow-md hover:bg-brand-blue-light transition"
                >
                  ➕ Tambah Alamat
                </button>
              </div>

              <div className="flex flex-col gap-5 mt-2">
                {addresses.map((addr) => (
                  <div 
                    key={addr.id} 
                    className={`p-5 rounded-2xl bg-white border border-white/50 flex justify-between gap-4 transition ${
                      addr.is_default ? "nm-pressed border-brand-blue/30" : "nm-flat"
                    }`}
                  >
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-brand-navy">{addr.label}</span>
                        {addr.is_default && (
                          <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-brand-blue/10 text-brand-blue">
                            Utama
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-700 font-bold">
                        {addr.recipient_name} <span className="text-zinc-400 font-normal">({addr.phone_number})</span>
                      </p>
                      <p className="text-xs text-zinc-500 leading-relaxed max-w-md">
                        {addr.full_address}
                      </p>
                    </div>

                    <div className="flex flex-col items-end justify-between gap-4 min-w-[100px]">
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-[10px] font-bold text-red-500 hover:text-red-700"
                      >
                        Hapus 🗑️
                      </button>
                      
                      {!addr.is_default && (
                        <button
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="px-3 py-1.5 rounded-lg text-[9px] font-bold bg-[#f0f4f8] nm-button text-brand-navy"
                        >
                          Set Utama
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {addresses.length === 0 && (
                  <div className="py-16 text-center text-zinc-400">
                    Belum ada alamat pengiriman terdaftar. Tambahkan alamat rumah atau kantor Anda.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: APP SECURITY & PIN */}
          {activeTab === "security" && (
            <div className="flex flex-col gap-8 animate-fade-in-up">
              
              {/* PIN Transactions panel (IMPORTANT for COD Security) */}
              <div className="p-8 rounded-3xl nm-flat bg-white border border-white/60 flex flex-col gap-6">
                <div>
                  <h3 className="text-xl font-black text-brand-navy flex items-center gap-2">
                    <span>🔑</span> PIN Transaksi COD KopeRT
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Atur PIN 6 digit untuk mengamankan pesanan dengan pembayaran Cash on Delivery (COD). Kurir akan meminta konfirmasi PIN ini setibanya di rumah Anda demi keamanan transaksi.
                  </p>
                </div>

                <form onSubmit={handleChangePin} className="flex flex-col gap-4">
                  {currentUser.has_pin && (
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                        PIN Transaksi Lama
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        placeholder="6 digit PIN lama Anda..."
                        value={oldPin}
                        onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))}
                        required
                        className="w-32 text-center tracking-[0.25em] px-4 py-2.5 rounded-xl text-sm nm-input text-brand-navy font-bold"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                        PIN Transaksi Baru (6 Digit Angka)
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        placeholder="Ketik 6 digit PIN..."
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                        required
                        className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy font-bold text-center tracking-[0.25em]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                        Konfirmasi PIN Baru
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        placeholder="Ulangi 6 digit PIN..."
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                        required
                        className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy font-bold text-center tracking-[0.25em]"
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-brand-orange hover:bg-brand-orange-light shadow transition"
                    >
                      {currentUser.has_pin ? "Ubah PIN Keamanan" : "Simpan PIN Baru"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Password update panel */}
              <div className="p-8 rounded-3xl nm-flat bg-white border border-white/60 flex flex-col gap-6">
                <div>
                  <h3 className="text-xl font-black text-brand-navy">Ubah Kata Sandi Akun</h3>
                  <p className="text-xs text-zinc-400 mt-1">Ubah kata sandi login Anda secara berkala</p>
                </div>

                <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                      Kata Sandi Saat Ini
                    </label>
                    <input
                      type="password"
                      placeholder="Masukkan kata sandi lama..."
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                      className="w-full max-w-sm px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                        Kata Sandi Baru (Min. 6 Karakter)
                      </label>
                      <input
                        type="password"
                        placeholder="Kata sandi baru..."
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                        Konfirmasi Kata Sandi Baru
                      </label>
                      <input
                        type="password"
                        placeholder="Ulangi kata sandi baru..."
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy"
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-brand-blue hover:bg-brand-blue-light shadow transition"
                    >
                      Ubah Kata Sandi
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* TAB 4: HELP CENTER (FAQ) */}
          {activeTab === "help" && (
            <div className="p-8 rounded-3xl nm-flat bg-white border border-white/60 flex flex-col gap-6 animate-fade-in-up">
              <div>
                <h3 className="text-xl font-black text-brand-navy">Pusat Bantuan & FAQ</h3>
                <p className="text-xs text-zinc-400 mt-1">Panduan berbelanja dan syarat ketentuan Koperasi RT</p>
              </div>

              {/* FAQ Accordion */}
              <div className="flex flex-col gap-3">
                {[
                  {
                    q: "Bagaimana cara melakukan belanja online di KopeRT?",
                    a: "Anda cukup memilih produk sembako atau ATK yang Anda inginkan di halaman utama, memasukkannya ke keranjang belanja, memilih metode pengantaran (ambil sendiri di kantor koperasi RT atau diantar kurir ke rumah Anda), dan melakukan pembayaran menggunakan Midtrans."
                  },
                  {
                    q: "Berapa minimal belanja untuk layanan antar gratis ke rumah?",
                    a: "Koperasi RT menyediakan layanan antar gratis langsung ke teras rumah Anda tanpa batas minimal nominal belanja, asalkan alamat Anda terdaftar di lingkup RT 04 / RW 02."
                  },
                  {
                    q: "Apakah pesanan COD (Bayar di Tempat) aman?",
                    a: "Ya. Untuk keamanan, kami menyarankan warga mengatur PIN Transaksi 6 digit di menu keamanan profil. Kurir kami akan mencocokkan PIN ini ketika mengantarkan barang setibanya di rumah Anda guna memastikan penerimaan yang sah."
                  },
                  {
                    q: "Bagaimana cara mendapatkan Poin dan Stamp digital?",
                    a: "Setiap transaksi lunas senilai kelipatan Rp 10.000 akan otomatis menghasilkan 1 A-Poin, dan kelipatan Rp 50.000 menghasilkan 1 Stamp digital. Kumpulkan poin untuk meningkatkan status keanggotaan Anda ke Gold/Platinum."
                  }
                ].map((faq, index) => (
                  <div key={index} className="rounded-xl border border-zinc-100 overflow-hidden">
                    <button
                      onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                      className="w-full p-4 text-left font-bold text-xs bg-zinc-50 hover:bg-zinc-100 flex justify-between items-center text-brand-navy"
                    >
                      <span>{faq.q}</span>
                      <span>{faqOpen === index ? "▲" : "▼"}</span>
                    </button>
                    {faqOpen === index && (
                      <div className="p-4 bg-white text-xs text-zinc-500 leading-relaxed border-t border-zinc-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Terms and Conditions Accordion */}
              <div className="border-t border-zinc-100 pt-6">
                <h4 className="font-extrabold text-xs text-brand-navy mb-3">Syarat & Ketentuan KopeRT</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">
                  Dengan mendaftar sebagai anggota digital KopeRT, Anda menyetujui syarat-syarat koperasi RT 04 setempat. Data pribadi berupa alamat rumah, tanggal lahir, dan nomor telepon hanya digunakan untuk operasional pengiriman kebutuhan sembako dan ATK serta tidak dipublikasikan ke luar.
                </p>
                <a 
                  href="#" 
                  className="text-xs text-brand-blue font-bold hover:underline"
                  onClick={(e) => { e.preventDefault(); alert("Kebijakan Privasi KopeRT mengikuti regulasi perlindungan data AD/ART Koperasi RT 04."); }}
                >
                  Kebijakan Privasi & AD/ART Koperasi
                </a>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Address Book Creation Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-brand-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#f0f4f8] rounded-3xl p-6 nm-flat border border-white/60 relative animate-fade-in-up">
            <button 
              onClick={() => setShowAddressModal(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full nm-button flex items-center justify-center font-bold text-xs"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <span className="text-4xl block mb-2">🏡</span>
              <h3 className="text-xl font-bold text-brand-navy">Tambah Alamat Baru</h3>
              <p className="text-xs text-zinc-500 mt-1">Daftarkan alamat baru untuk memudahkan kirim</p>
            </div>

            <form onSubmit={handleAddAddress} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                  Label Alamat *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Rumah Utama, Kantor, Toko"
                  value={addrLabel}
                  onChange={(e) => setAddrLabel(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                    Nama Penerima *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pak Budi"
                    value={addrRecipient}
                    onChange={(e) => setAddrRecipient(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                    No. Telpon Penerima *
                  </label>
                  <input
                    type="tel"
                    placeholder="Contoh: 0812xxxx"
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                  Alamat Lengkap (No. Rumah & RT/RW) *
                </label>
                <textarea
                  placeholder="Ketik alamat pengiriman lengkap..."
                  value={addrFull}
                  onChange={(e) => setAddrFull(e.target.value)}
                  required
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy resize-none"
                />
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="addr-default"
                  checked={addrIsDefault}
                  onChange={(e) => setAddrIsDefault(e.target.checked)}
                  className="w-4 h-4 accent-brand-blue rounded"
                />
                <label htmlFor="addr-default" className="text-xs font-semibold text-brand-navy cursor-pointer">
                  Jadikan sebagai alamat utama
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-brand-blue hover:bg-brand-blue-light shadow-md transition"
              >
                Simpan Alamat Baru 🚀
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-brand-navy text-zinc-400 text-xs py-8 px-6 mt-16 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h4 className="font-bold text-sm text-white">KopeRT © 2026</h4>
            <p className="text-[11px] text-zinc-500 mt-1">Website E-Commerce Koperasi RT 04 / RW 02. Hak Cipta Dilindungi.</p>
          </div>
          <div className="flex gap-4">
            <span className="text-zinc-600">Teknologi Stack:</span>
            <span>Django 6.0.5</span>
            <span>Next.js 16</span>
            <span>React 19.2.6</span>
            <span>MySQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
