"use client";

import React, { useState, useEffect } from "react";
import ScrollReveal from "@/components/ScrollReveal";

// Safe storage wrapper to prevent crash in Safari Private Mode
const safeStorage = (type: "session" | "local") => {
  const isAvailable = () => {
    try {
      if (typeof window === "undefined") return false;
      const storage = window[type === "session" ? "sessionStorage" : "localStorage"];
      if (!storage) return false;
      const testKey = "__storage_test__";
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  };

  const hasStorage = isAvailable();
  let inMemoryStore: Record<string, string> = {};

  return {
    getItem: (key: string): string | null => {
      try {
        if (hasStorage && typeof window !== "undefined") {
          return window[type === "session" ? "sessionStorage" : "localStorage"].getItem(key);
        }
      } catch (e) {}
      return inMemoryStore[key] || null;
    },
    setItem: (key: string, value: string): void => {
      try {
        if (hasStorage && typeof window !== "undefined") {
          window[type === "session" ? "sessionStorage" : "localStorage"].setItem(key, value);
          return;
        }
      } catch (e) {}
      inMemoryStore[key] = String(value);
    },
    removeItem: (key: string): void => {
      try {
        if (hasStorage && typeof window !== "undefined") {
          window[type === "session" ? "sessionStorage" : "localStorage"].removeItem(key);
          return;
        }
      } catch (e) {}
      delete inMemoryStore[key];
    },
    clear: (): void => {
      try {
        if (hasStorage && typeof window !== "undefined") {
          window[type === "session" ? "sessionStorage" : "localStorage"].clear();
          return;
        }
      } catch (e) {}
      inMemoryStore = {};
    }
  };
};

const sessionStorage = safeStorage("session");
const localStorage = safeStorage("local");

const API_BASE_URL = typeof window !== "undefined"
  ? `http://${window.location.hostname}:8000`
  : "http://127.0.0.1:8000";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  original_price?: number;
  image: string;
  stock: number;
  desc: string;
  created_at?: string;
  updated_at?: string;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  nama: string;
  phone_number: string;
  address: string | null;
  role: "guest" | "user" | "warga" | "admin";
  nik?: string;
  has_pin?: boolean;
  points?: number;
  stamps?: number;
  member_tier?: "silver" | "gold" | "platinum";
}

interface Address {
  id: number;
  label: string;
  recipient_name: string;
  phone_number: string;
  full_address: string;
  is_default: boolean;
}

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: string;
}

interface Order {
  id: number;
  order_id: string;
  user: UserProfile;
  total_price: string;
  shipping_method: "pickup" | "delivery";
  delivery_address: string | null;
  payment_method: "midtrans" | "cod";
  payment_status: "pending" | "paid" | "failed" | "expired";
  shipping_status: "proses" | "siap_diambil" | "sedang_diantar" | "selesai";
  snap_token: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

const getCategoryBadgeClass = (category: string) => {
  switch (category) {
    case "Sembako":
      return "bg-blue-100 text-brand-blue";
    case "Makanan dan Minuman":
      return "bg-amber-100 text-amber-800";
    case "ATK":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-zinc-100 text-zinc-600";
  }
};

const getProductImageUrl = (prod: { id: number; name: string; category: string; image: string }) => {
  if (prod.image && (prod.image.startsWith("/") || prod.image.startsWith("http"))) {
    return prod.image;
  }
  
  const catLower = prod.category.toLowerCase();
  if (catLower.includes("sembako")) {
    return "/images/category_sembako.png";
  } else if (catLower.includes("minuman") || catLower.includes("makanan")) {
    return "/images/category_susu.png";
  } else if (catLower.includes("atk")) {
    return "/images/category_atk.png";
  }
  
  return "/images/category_sembako.png";
};

const getProductImageStyle = (name: string) => {
  return {};
};

const getProductDiscountInfo = (product: Product, user: UserProfile | null) => {
  if (!user || user.role === "admin" || user.role === "guest") {
    return { discountPercent: 0, price: product.price, originalPrice: product.price };
  }
  
  let discount = 0;
  const tier = user.member_tier || "silver";
  if (user.role === "warga") {
    if (tier === "platinum") discount = 8.5;
    else if (tier === "gold") discount = 6.0;
    else discount = 4.0;
  } else if (user.role === "user") {
    if (tier === "platinum") discount = 2.5;
    else if (tier === "gold") discount = 1.0;
    else discount = 0.0;
  }
  
  const originalPrice = product.original_price ?? product.price;
  const discountedPrice = Math.round(originalPrice * (1.0 - discount / 100));
  
  return {
    discountPercent: discount,
    price: discountedPrice,
    originalPrice: originalPrice
  };
};

export default function Home() {
  // App States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [showOrdersHistory, setShowOrdersHistory] = useState(false);
  
  // Address & Payment & PIN states for profile / COD integration
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"midtrans" | "cod">("midtrans");
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  // Admin and Product management states
  const [adminTab, setAdminTab] = useState<"analytics" | "users" | "warga" | "products" | "logistics" | "financial">("analytics");
  const [wargaList, setWargaList] = useState<{ id: number; nik: string; token: string; is_used: boolean; created_at: string }[]>([]);
  const [newNik, setNewNik] = useState("");
  const [wargaError, setWargaError] = useState("");
  const [wargaSuccess, setWargaSuccess] = useState("");

  // New Admin Dashboard states
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [financialRecon, setFinancialRecon] = useState<any[]>([]);
  const [loyaltyLogs, setLoyaltyLogs] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [bulkNiksInput, setBulkNiksInput] = useState("");

  // COD Courier panel states
  const [codOrderId, setCodOrderId] = useState("");
  const [codPinInput, setCodPinInput] = useState("");
  const [codPinError, setCodPinError] = useState("");
  const [codPinSuccess, setCodPinSuccess] = useState("");

  // Product search/filter states for admin products tab
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("Semua");
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [productModalMode, setProductModalMode] = useState<"add" | "edit">("add");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodCategory, setProdCategory] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodStock, setProdStock] = useState("");
  const [prodImage, setProdImage] = useState("📦");
  const [prodDesc, setProdDesc] = useState("");

  // Modal / Auth States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register Form States
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regAddress, setRegAddress] = useState("");

  const fetchDashboardStats = async () => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/admin/dashboard-stats/`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardStats(data);
      }
    } catch (err) {
      console.error("Gagal memuat statistik dashboard:", err);
    }
  };

  const fetchFinancialRecon = async () => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/admin/reconciliation/`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFinancialRecon(data.daily_reconciliation || []);
      }
    } catch (err) {
      console.error("Gagal memuat rekonsiliasi finansial:", err);
    }
  };

  const fetchLoyaltyLogs = async () => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/admin/loyalty-audit/`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLoyaltyLogs(data);
      }
    } catch (err) {
      console.error("Gagal memuat audit log loyalitas:", err);
    }
  };

  const fetchAdminUsers = async () => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/admin/users/`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data);
      }
    } catch (err) {
      console.error("Gagal memuat daftar pengguna:", err);
    }
  };

  const fetchWargaList = async () => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/admin/warga-verification/`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWargaList(data);
      }
    } catch (err) {
      console.error("Gagal mengambil daftar NIK:", err);
    }
  };

  const handleCreateWargaVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setWargaError("");
    setWargaSuccess("");
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    if (newNik.length !== 16) {
      setWargaError("NIK harus tepat 16 digit angka.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/admin/warga-verification/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ nik: newNik })
      });
      const data = await res.json();
      if (res.ok) {
        setWargaSuccess(`Berhasil mendaftarkan NIK ${newNik}! Token: ${data.token}`);
        setNewNik("");
        fetchWargaList();
      } else {
        setWargaError(data.nik?.join(" ") || "Gagal mendaftarkan NIK.");
      }
    } catch (err) {
      setWargaError("Koneksi gagal.");
    }
  };

  const handleDeleteWargaVerification = async (id: number) => {
    setWargaError("");
    setWargaSuccess("");
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    if (!confirm("Apakah Anda yakin ingin menghapus data NIK dan Token ini?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/admin/warga-verification/${id}/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        setWargaSuccess("Data NIK berhasil dihapus.");
        fetchWargaList();
      } else {
        setWargaError("Gagal menghapus NIK.");
      }
    } catch (err) {
      setWargaError("Koneksi gagal.");
    }
  };

  // Load profile & orders on mount
  useEffect(() => {
    fetchProducts();
    const initApp = async () => {
      // Load cached profile instantly to prevent guest UI flicker
      const cachedUser = sessionStorage.getItem("user_profile");
      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser);
          setCurrentUser(parsed);
          if (parsed.address) {
            setDeliveryAddress(parsed.address);
          }
          // Load cart from localStorage for this user
          const savedCart = localStorage.getItem(`cart_${parsed.id}`);
          if (savedCart) {
            setCart(JSON.parse(savedCart));
          }
        } catch (e) {
          console.error("Gagal memuat profil cache:", e);
        }
      }

      const token = sessionStorage.getItem("access_token");
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me/`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data);
          sessionStorage.setItem("user_profile", JSON.stringify(data));
          if (data.address) {
            setDeliveryAddress(data.address);
          }
          // Load cart from localStorage for this user
          const savedCart = localStorage.getItem(`cart_${data.id}`);
          if (savedCart) {
            setCart(JSON.parse(savedCart));
          } else {
            setCart([]);
          }
          // Fetch user's orders
          fetchOrders(token);
          fetchAddresses(token);
          
          if (data.role === 'admin') {
            fetchWargaList();
            fetchDashboardStats();
            fetchFinancialRecon();
            fetchLoyaltyLogs();
            fetchAdminUsers();
          }
        } else {
          handleLogout();
        }
      } catch (err) {
        console.error("Gagal memuat data awal:", err);
      }
    };
    initApp();
  }, []);

  const fetchOrders = async (tokenOverride?: string) => {
    const token = tokenOverride || sessionStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Gagal mengambil daftar pesanan:", err);
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
        const defaultAddr = data.find((addr: Address) => addr.is_default);
        if (defaultAddr) {
          setDeliveryAddress(defaultAddr.full_address);
        }
      }
    } catch (err) {
      console.error("Gagal memuat buku alamat:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Gagal memuat produk:", err);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("user_profile");
    setCurrentUser(null);
    setOrders([]);
    setCart([]);
    setShowOrdersHistory(false);
    setSuccessMsg("Berhasil keluar akun.");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // Login API Call
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginIdentifier,
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        sessionStorage.setItem("access_token", data.access);
        sessionStorage.setItem("refresh_token", data.refresh);

        // Fetch User Info
        const profileRes = await fetch(`${API_BASE_URL}/api/auth/me/`, {
          headers: {
            "Authorization": `Bearer ${data.access}`,
          },
        });
        
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setCurrentUser(profileData);
          sessionStorage.setItem("user_profile", JSON.stringify(profileData));
          if (profileData.address) {
            setDeliveryAddress(profileData.address);
          }
          // Load cart from localStorage for this user
          const savedCart = localStorage.getItem(`cart_${profileData.id}`);
          if (savedCart) {
            setCart(JSON.parse(savedCart));
          } else {
            setCart([]);
          }
          setSuccessMsg(`Selamat datang, ${profileData.nama}!`);
          setLoginIdentifier("");
          setLoginPassword("");
          setShowAuthModal(false);
          fetchOrders(data.access);
          fetchAddresses(data.access);
          if (profileData.role === 'admin') {
            fetchWargaList();
            fetchDashboardStats();
            fetchFinancialRecon();
            fetchLoyaltyLogs();
            fetchAdminUsers();
          }
          setTimeout(() => setSuccessMsg(""), 3000);
        }
      } else {
        setErrorMsg(data.detail || "Email/Username atau password salah.");
      }
    } catch (err) {
      setErrorMsg("Koneksi ke backend gagal. Pastikan Django server berjalan.");
    }
  };

  // Register API Call
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!regName || !regEmail || !regPhone || !regPassword) {
      setErrorMsg("Harap isi semua kolom wajib.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama: regName,
          username: regUsername || regEmail,
          email: regEmail,
          phone_number: regPhone,
          password: regPassword,
          address: regAddress || "",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg("Pendaftaran berhasil! Silakan masuk dengan akun baru Anda.");
        setAuthMode("login");
        setLoginIdentifier(regEmail);
        
        setRegName("");
        setRegUsername("");
        setRegEmail("");
        setRegPhone("");
        setRegPassword("");
        setRegAddress("");
      } else {
        let errMsg = "";
        for (const key in data) {
          errMsg += `${key}: ${data[key].join(" ")} `;
        }
        setErrorMsg(errMsg || "Gagal melakukan registrasi.");
      }
    } catch (err) {
      setErrorMsg("Koneksi ke backend gagal. Pastikan Django server berjalan.");
    }
  };

  // Checkout API Call with Midtrans & COD integration
  const handleCheckout = async (pinCode?: string) => {
    const token = sessionStorage.getItem("access_token");
    if (!token) {
      setAuthMode("login");
      setShowAuthModal(true);
      return;
    }

    if (shippingMethod === "delivery" && !deliveryAddress.trim()) {
      alert("Silakan masukkan alamat rumah terlebih dahulu untuk metode antar!");
      return;
    }

    // COD Flow: Requires PIN
    if (paymentMethod === "cod" && !pinCode) {
      if (!currentUser?.has_pin) {
        alert("Anda belum mengatur PIN Keamanan Transaksi COD. Silakan atur terlebih dahulu di menu Keamanan halaman Profil Anda.");
        window.location.href = "/profile";
        return;
      }
      // Show PIN verification modal
      setPinInput("");
      setPinError("");
      setShowPinModal(true);
      return;
    }

    // Map cart items to API format
    const itemsPayload = cart.map((item) => {
      const priceInfo = getProductDiscountInfo(item.product, currentUser);
      return {
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.qty,
        price: priceInfo.price,
      };
    });

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          shipping_method: shippingMethod,
          delivery_address: shippingMethod === "delivery" ? deliveryAddress : "",
          payment_method: paymentMethod,
          items: itemsPayload,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (paymentMethod === "cod") {
          setSuccessMsg("Pesanan COD berhasil dibuat! Kurir RT akan segera memproses.");
          setCart([]);
          if (currentUser) {
            localStorage.removeItem(`cart_${currentUser.id}`);
          }
          setIsCartOpen(false);
          setShowPinModal(false);
          fetchOrders(token);
          setTimeout(() => setSuccessMsg(""), 4000);
        } else {
          const snapToken = data.snap_token;
          
          // Trigger Midtrans Snap payment modal
          if (typeof window !== "undefined" && (window as any).snap) {
            (window as any).snap.pay(snapToken, {
              onSuccess: (result: any) => {
                setSuccessMsg("Pembayaran berhasil diselesaikan!");
                setCart([]);
                if (currentUser) {
                  localStorage.removeItem(`cart_${currentUser.id}`);
                }
                setIsCartOpen(false);
                fetchOrders(token);
                setTimeout(() => setSuccessMsg(""), 4000);
              },
              onPending: (result: any) => {
                alert("Pembayaran Anda tertunda. Selesaikan pembayaran di channel pilihan Anda.");
                setCart([]);
                if (currentUser) {
                  localStorage.removeItem(`cart_${currentUser.id}`);
                }
                setIsCartOpen(false);
                fetchOrders(token);
              },
              onError: (result: any) => {
                alert("Gagal melakukan pembayaran. Silakan coba lagi.");
                fetchOrders(token);
              },
              onClose: () => {
                alert("Anda menutup halaman pembayaran sebelum menyelesaikan transaksi.");
                fetchOrders(token);
              }
            });
          } else {
            // Fallback simulation if midtrans SDK failed to load
            alert("Pembayaran Koperasi (Simulasi Offline): Pesanan telah disimpan dengan status pending.");
            setCart([]);
            if (currentUser) {
              localStorage.removeItem(`cart_${currentUser.id}`);
            }
            setIsCartOpen(false);
            fetchOrders(token);
          }
        }
      } else {
        alert(data.detail || "Gagal membuat pesanan.");
      }
    } catch (err) {
      alert("Koneksi gagal saat membuat pesanan.");
    }
  };

  const handleVerifyPinAndCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    if (pinInput.length !== 6 || !/^\d+$/.test(pinInput)) {
      setPinError("PIN harus berupa 6 digit angka.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile/verify-pin/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ pin: pinInput })
      });

      if (res.ok) {
        // PIN verified, proceed with checkout
        handleCheckout(pinInput);
      } else {
        const data = await res.json();
        setPinError(data.detail || "PIN yang Anda masukkan salah.");
      }
    } catch (err) {
      setPinError("Koneksi gagal untuk verifikasi PIN.");
    }
  };

  // Admin Update Order Status API Call
  const handleAdminUpdateStatus = async (orderId: string, payload: { shipping_status?: string; payment_status?: string }) => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/admin-update/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          ...payload,
        }),
      });

      if (res.ok) {
        setSuccessMsg("Status pesanan warga berhasil diperbarui.");
        fetchOrders(token);
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const data = await res.json();
        alert(data.detail || "Gagal memperbarui status.");
      }
    } catch (err) {
      alert("Koneksi gagal.");
    }
  };

  // Product CRUD Functions for Admin Dashboard
  const openAddProductModal = () => {
    setProductModalMode("add");
    setSelectedProductId(null);
    setProdName("");
    setProdCategory("Sembako");
    setProdPrice("");
    setProdStock("");
    setProdImage("📦");
    setProdDesc("");
    setShowProductModal(true);
  };

  const openEditProductModal = (prod: Product) => {
    setProductModalMode("edit");
    setSelectedProductId(prod.id);
    setProdName(prod.name);
    setProdCategory(prod.category);
    setProdPrice(prod.price.toString());
    setProdStock(prod.stock.toString());
    setProdImage(prod.image);
    setProdDesc(prod.desc || "");
    setShowProductModal(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    if (!prodName || !prodCategory || !prodPrice || !prodStock) {
      alert("Harap lengkapi semua kolom wajib!");
      return;
    }

    const payload = {
      name: prodName,
      category: prodCategory,
      price: parseFloat(prodPrice),
      stock: parseInt(prodStock),
      image: prodImage,
      desc: prodDesc
    };

    const url = productModalMode === "add"
      ? `${API_BASE_URL}/api/products/`
      : `${API_BASE_URL}/api/products/${selectedProductId}/`;

    const method = productModalMode === "add" ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMsg(productModalMode === "add" ? "Produk baru berhasil ditambahkan! 📦" : "Detail produk berhasil disimpan! 💾");
        setShowProductModal(false);
        fetchProducts();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const data = await res.json();
        alert(JSON.stringify(data) || "Gagal menyimpan produk.");
      }
    } catch (err) {
      alert("Koneksi gagal.");
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    if (!confirm("Apakah Anda yakin ingin menghapus produk ini secara permanen dari etalase koperasi?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${id}/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        setSuccessMsg("Produk berhasil dihapus! 🗑️");
        fetchProducts();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        alert("Gagal menghapus produk. Hubungi Admin.");
      }
    } catch (err) {
      alert("Koneksi gagal.");
    }
  };

  // Add to cart logic
  const handleAddToCart = (product: Product) => {
    if (!currentUser) {
      setAuthMode("login");
      setErrorMsg("Harap login terlebih dahulu untuk memasukkan barang.");
      setShowAuthModal(true);
      return;
    }

    if (product.stock <= 0) {
      alert("Maaf, stok barang ini sedang habis!");
      return;
    }
    
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      let newCart;
      if (existing) {
        // Limit quantity in cart to product stock
        if (existing.qty >= product.stock) {
          alert(`Stok tidak mencukupi! Anda hanya bisa membeli maksimal ${product.stock} pcs.`);
          return prevCart;
        }
        newCart = prevCart.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        newCart = [...prevCart, { product, qty: 1 }];
      }
      localStorage.setItem(`cart_${currentUser.id}`, JSON.stringify(newCart));
      return newCart;
    });
  };

  const updateCartQty = (id: number, delta: number) => {
    if (!currentUser) return;
    setCart((prevCart) => {
      const newCart = prevCart
        .map((item) => {
          if (item.product.id === id) {
            const newQty = item.qty + delta;
            // Check stock limit when incrementing
            if (delta > 0 && newQty > item.product.stock) {
              alert(`Stok tidak mencukupi! Batas pembelian produk ini adalah ${item.product.stock} pcs.`);
              return item;
            }
            return { ...item, qty: newQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0);
      localStorage.setItem(`cart_${currentUser.id}`, JSON.stringify(newCart));
      return newCart;
    });
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const priceInfo = getProductDiscountInfo(item.product, currentUser);
      return total + priceInfo.price * item.qty;
    }, 0);
  };

  // Filter products from backend database
  const filteredProducts = products.filter((prod) => {
    const matchesCategory = selectedCategory === "Semua" || prod.category === selectedCategory;
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const userRole = currentUser?.role || "guest";

  // Compute Admin Dashboard Metrics dynamically from database orders
  const paidOrders = orders.filter((o) => o.payment_status === "paid");
  const totalOmzet = paidOrders.reduce((sum, o) => sum + parseFloat(o.total_price), 0);
  const pendingOrdersCount = orders.filter((o) => o.payment_status === "pending").length;
  const processedOrdersCount = orders.filter((o) => o.shipping_status === "proses" && o.payment_status === "paid").length;
  const uniqueUsers = Array.from(new Set(orders.map((o) => o.user.id))).length;

  // ── Admin: Bulk create NIK warga ──────────────────────────────────────────
  const handleBulkCreateNiks = async (e: React.FormEvent) => {
    e.preventDefault();
    setWargaError("");
    setWargaSuccess("");
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    const trimmed = bulkNiksInput.trim();
    if (!trimmed) {
      setWargaError("Harap masukkan minimal satu NIK.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/admin/warga-verification/bulk-create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ niks: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setWargaSuccess(
          `✅ ${data.message} (Dibuat: ${data.created_count}, Dilewati: ${data.skipped_count})` +
          (data.errors?.length > 0 ? ` | Errors: ${data.errors.join(", ")}` : "")
        );
        setBulkNiksInput("");
        fetchWargaList();
      } else {
        setWargaError(data.detail || "Gagal mendaftarkan NIK.");
      }
    } catch (err) {
      setWargaError("Koneksi gagal saat mendaftarkan NIK.");
    }
  };

  // ── Admin: Verify COD PIN on delivery ────────────────────────────────────
  const handleVerifyCodPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodPinError("");
    setCodPinSuccess("");
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    if (!codOrderId) {
      setCodPinError("Pilih pesanan COD terlebih dahulu.");
      return;
    }
    if (codPinInput.length !== 6 || !/^\d+$/.test(codPinInput)) {
      setCodPinError("PIN harus berupa 6 digit angka.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/admin/verify-cod-pin/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ order_id: codOrderId, pin: codPinInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setCodPinSuccess(data.message || "Verifikasi PIN COD berhasil. Pesanan ditandai Lunas & Selesai.");
        setCodOrderId("");
        setCodPinInput("");
        fetchOrders(token);
        setTimeout(() => setCodPinSuccess(""), 5000);
      } else {
        setCodPinError(data.detail || "Verifikasi PIN gagal.");
      }
    } catch (err) {
      setCodPinError("Koneksi gagal saat verifikasi PIN COD.");
    }
  };

  // ── Admin: Update user role & tier ───────────────────────────────────────
  const handleUpdateUserRoleTier = async (userId: number, newRole: string, newTier: string) => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/admin/users/${userId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole, member_tier: newTier }),
      });
      if (res.ok) {
        setSuccessMsg("Role/Tier pengguna berhasil diperbarui.");
        fetchAdminUsers();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const data = await res.json();
        alert(data.detail || "Gagal memperbarui role/tier pengguna.");
      }
    } catch (err) {
      alert("Koneksi gagal saat memperbarui pengguna.");
    }
  };

  // ── Admin: Delete user ────────────────────────────────────────────────────
  const handleDeleteUser = async (userId: number) => {
    const token = sessionStorage.getItem("access_token");
    if (!token) return;

    if (!confirm("Apakah Anda yakin ingin menghapus akun pengguna ini secara permanen?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/admin/users/${userId}/`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) {
        setSuccessMsg("Akun pengguna berhasil dihapus.");
        fetchAdminUsers();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const data = await res.json();
        alert(data.detail || "Gagal menghapus pengguna.");
      }
    } catch (err) {
      alert("Koneksi gagal saat menghapus pengguna.");
    }
  };

  return (
    <div className="min-h-screen bg-brand-navy-light/5 text-brand-navy flex flex-col font-sans">
      
      {/* Dynamic Success Notification Toast */}
      {successMsg && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg z-50 text-xs font-bold flex items-center gap-2 animate-bounce">
          <span>✅</span> {successMsg}
        </div>
      )}

      {/* Main Header / Navbar */}
      <header className="sticky top-0 bg-[#f0f4f8]/90 backdrop-blur-md z-40 py-4 px-6 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <div className={`${userRole === "admin" ? "w-full px-4" : "max-w-6xl mx-auto"} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛒</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
                Kope<span className="text-brand-orange">RT</span>
              </h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Koperasi RT Digital</p>
            </div>
          </div>

          {/* Search Bar - Neumorphic Input */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="w-full relative">
              <input
                type="text"
                placeholder="Cari sembako, ATK, minyak goreng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3 rounded-full text-sm nm-input text-brand-navy"
              />
              <span className="absolute right-4 top-3.5 text-zinc-400">🔍</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Show Order History button for normal users */}
            {currentUser && userRole !== "admin" && (
              <button 
                onClick={() => setShowOrdersHistory(!showOrdersHistory)}
                className="px-4 py-2.5 rounded-full text-xs font-bold nm-button text-brand-navy flex items-center gap-1.5"
              >
                📋 {showOrdersHistory ? "Lihat Belanja" : "Riwayat Pesanan"}
              </button>
            )}

            {/* Cart Button */}
            {userRole !== "admin" && !showOrdersHistory && (
              <button 
                onClick={() => setIsCartOpen(!isCartOpen)}
                className="relative p-3 rounded-full nm-button flex items-center justify-center text-lg"
              >
                👜
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-orange text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                    {cart.reduce((total, item) => total + item.qty, 0)}
                  </span>
                )}
              </button>
            )}

            {/* Profile / Auth Status */}
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-brand-navy">{currentUser.nama}</span>
                  <span className="text-[10px] text-zinc-400 capitalize">{currentUser.role === 'admin' ? 'Pengurus RT' : currentUser.role === 'warga' ? 'Warga RT' : 'Pengunjung Terdaftar'}</span>
                </div>
                <button 
                  onClick={() => window.location.href = "/profile"}
                  className="px-4 py-2.5 rounded-full text-xs font-bold nm-button text-brand-blue"
                >
                  Profil Saya 👤
                </button>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold nm-button text-red-600 hover:text-red-800"
                >
                  Logout 🚪
                </button>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setAuthMode("login");
                  setErrorMsg("");
                  setShowAuthModal(true);
                }}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-brand-navy hover:bg-brand-navy-light shadow-md transition-all"
              >
                Masuk / Daftar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main App Container */}
      {userRole === "admin" ? (
        <main className="flex-1 w-full p-0 flex flex-col">
          <ScrollReveal animation="fade-in">
            {/* ══════════════════════════════════════════════════════════════ */}
            {/*  MODERN PROFESSIONAL ADMIN DASHBOARD                          */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <div id="admin-dashboard" style={{ minHeight: "calc(100vh - 80px)" }}
              className="flex overflow-hidden border-0 shadow-none w-full"
            >
              {/* Sidebar backdrop for mobile */}
              {isMobileSidebarOpen && (
                <div 
                  onClick={() => setIsMobileSidebarOpen(false)}
                  style={{ zIndex: 40 }}
                  className="fixed inset-0 bg-black/40 backdrop-blur-xs md:hidden"
                />
              )}

              {/* ── LEFT SIDEBAR ─────────────────────────────────────────── */}
              <aside
                className={`
                  fixed md:static inset-y-0 left-0 flex flex-col py-8 px-4 gap-2 overflow-hidden transition-transform duration-300 ease-in-out
                  md:translate-x-0
                  ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
                `}
                style={{
                  background: "linear-gradient(160deg, #0a192f 0%, #0d2137 50%, #0f2a48 100%)",
                  width: "260px",
                  minWidth: "260px",
                  flexShrink: 0,
                  zIndex: 55,
                }}
              >
                {/* Sidebar decorative glows */}
                <div style={{ width:200, height:200, background:"radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)", top:-60, right:-60, position:"absolute", borderRadius:"50%" }} />
                <div style={{ width:150, height:150, background:"radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)", bottom:40, left:-40, position:"absolute", borderRadius:"50%" }} />

                {/* Brand & Close button */}
                <div className="flex items-center justify-between mb-8 px-3">
                  <div className="flex items-center gap-3">
                    <div style={{ background:"linear-gradient(135deg,#ff6b00,#ff8c00)", borderRadius:12 }} className="w-10 h-10 flex items-center justify-center text-xl font-black text-white shadow-lg">K</div>
                    <div>
                      <div className="font-black text-white text-base tracking-tight">Kope<span style={{color:"#ff6b00"}}>RT</span></div>
                      <div style={{color:"rgba(255,255,255,0.4)"}} className="text-[9px] uppercase tracking-widest font-semibold">Admin Panel</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="md:hidden w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs"
                    title="Tutup Menu"
                  >
                    ✕
                  </button>
                </div>

                {/* Admin info pill */}
                <div style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12 }} className="flex items-center gap-3 px-3 py-3 mb-6">
                  <div style={{ background:"linear-gradient(135deg,#3b82f6,#6366f1)", borderRadius:"50%" }} className="w-9 h-9 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {currentUser?.nama?.[0]?.toUpperCase() || "A"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white text-xs font-bold truncate">{currentUser?.nama}</div>
                    <div style={{color:"rgba(255,255,255,0.4)"}} className="text-[9px] font-semibold">Pengurus RT 04/RW 02</div>
                  </div>
                </div>

                {/* Navigation section label */}
                <div style={{color:"rgba(255,255,255,0.3)"}} className="text-[9px] uppercase tracking-[0.2em] font-bold px-3 mb-2">Menu Utama</div>

                {/* Nav items */}
                {([
                  { key: "analytics", icon: "📊", label: "Analitik & Ringkasan", desc: "Overview & KPI" },
                  { key: "users",     icon: "👥", label: "Kelola Pengguna",      desc: "Role & Tier" },
                  { key: "warga",     icon: "🔑", label: "NIK & Token Warga",   desc: "Verifikasi Warga" },
                  { key: "products",  icon: "📦", label: "Kelola Barang",        desc: "Inventori & Harga" },
                  { key: "logistics", icon: "🚚", label: "Logistik & COD",      desc: "Pengiriman & Kurir" },
                  { key: "financial", icon: "🪙", label: "Audit & Finansial",   desc: "Rekonsiliasi" },
                ] as const).map((item) => {
                  const isActive = adminTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setAdminTab(item.key);
                        setIsMobileSidebarOpen(false);
                      }}
                      type="button"
                      style={{
                        background: isActive ? "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.2))" : "transparent",
                        border: isActive ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent",
                        borderRadius: 12,
                        transition: "all 0.2s ease",
                      }}
                      className="flex items-center gap-3 px-3 py-3 text-left w-full group hover:bg-white/5"
                    >
                      <span style={{
                        background: isActive ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "rgba(255,255,255,0.08)",
                        borderRadius: 8,
                        transition: "all 0.2s",
                        flexShrink: 0,
                      }} className="w-8 h-8 flex items-center justify-center text-sm">
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <div style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.6)", fontWeight: isActive ? 700 : 500, fontSize: 12 }}>{item.label}</div>
                        <div style={{color:"rgba(255,255,255,0.3)"}} className="text-[9px]">{item.desc}</div>
                      </div>
                      {isActive && <div style={{ width:3, height:"100%", background:"linear-gradient(#3b82f6,#6366f1)", borderRadius:4, marginLeft:"auto", minHeight:20 }} />}
                    </button>
                  );
                })}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Divider */}
                <div style={{ borderTop:"1px solid rgba(255,255,255,0.08)" }} className="mt-4 pt-4 flex flex-col gap-2">
                  <div style={{color:"rgba(255,255,255,0.3)"}} className="text-[9px] uppercase tracking-[0.2em] font-bold px-3 mb-1">Aksi Cepat</div>
                  <button
                    type="button"
                    onClick={() => {
                      fetchOrders(); fetchWargaList(); fetchDashboardStats();
                      fetchFinancialRecon(); fetchLoyaltyLogs(); fetchAdminUsers();
                      setSuccessMsg("Data berhasil disegarkan! 🔄");
                      setTimeout(() => setSuccessMsg(""), 2000);
                    }}
                    style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, color:"rgba(255,255,255,0.7)", fontSize:11, fontWeight:700, transition:"all 0.2s" }}
                    className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/10"
                  >
                    <span>🔄</span> Segarkan Semua Data
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, color:"rgba(239,68,68,0.8)", fontSize:11, fontWeight:700, transition:"all 0.2s" }}
                    className="flex items-center gap-2 px-3 py-2.5 hover:bg-red-500/20"
                  >
                    <span>🚪</span> Keluar Akun
                  </button>
                </div>
              </aside>

              {/* ── MAIN CONTENT AREA ────────────────────────────────────── */}
              <main style={{ background:"#f8fafc", flex:1, overflowX:"hidden" }} className="flex flex-col min-h-full w-full">

                {/* Top bar */}
                <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0" }} className="flex items-center justify-between px-4 md:px-8 py-4 shrink-0 gap-3">
                  <div className="flex items-center gap-3">
                    {/* Hamburger Button for mobile */}
                    <button
                      type="button"
                      onClick={() => setIsMobileSidebarOpen(true)}
                      className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-brand-navy shrink-0 transition"
                      title="Menu Admin"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <div>
                      <h2 style={{ color:"#0a192f", fontWeight:800, fontSize:18, lineHeight:1.2 }} className="text-base md:text-lg">
                      {adminTab === "analytics" && "📊 Analitik & Ringkasan"}
                      {adminTab === "users"     && "👥 Manajemen Akun Pengguna"}
                      {adminTab === "warga"     && "🔑 Pendataan NIK & Token Warga"}
                      {adminTab === "products"  && "📦 Kelola Inventori Barang"}
                      {adminTab === "logistics" && "🚚 Logistik & Verifikasi COD"}
                      {adminTab === "financial" && "🪙 Audit & Rekonsiliasi Finansial"}
                    </h2>
                    <p style={{ color:"#94a3b8", fontSize:11, marginTop:2 }}>
                      KopeRT · RT 04 / RW 02 · {new Date().toLocaleDateString("id-ID", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                    <div style={{ background:"#f1f5f9", borderRadius:10, padding:"6px 14px", fontSize:11, fontWeight:700, color:"#475569" }} className="flex items-center gap-2">
                      <span style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", display:"inline-block", boxShadow:"0 0 0 2px rgba(34,197,94,0.3)" }} />
                      Server Online
                    </div>
                    <button
                      type="button"
                      onClick={() => window.location.href = "/profile"}
                      style={{ background:"linear-gradient(135deg,#0056b3,#3b82f6)", borderRadius:10, color:"#fff", fontSize:11, fontWeight:700, padding:"6px 14px" }}
                    >
                      👤 Profil
                    </button>
                  </div>
                </div>

                {/* ═══ TAB CONTENT ═══════════════════════════════════════════ */}
                <div className="flex-1 p-8 overflow-y-auto">

                  {/* ── TAB 1: ANALYTICS ─────────────────────────────────── */}
                  {adminTab === "analytics" && (
                    <div className="animate-fade-in-up flex flex-col gap-6">

                      {/* KPI Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                        {/* Revenue */}
                        <div style={{ background:"linear-gradient(135deg,#0056b3 0%,#3b82f6 100%)", borderRadius:16, padding:"20px 24px", position:"relative", overflow:"hidden" }} className="text-white shadow-lg">
                          <div style={{ position:"absolute", top:-20, right:-20, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.08)" }} />
                          <div style={{ fontSize:10, fontWeight:700, opacity:0.7, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Total Pendapatan</div>
                          <div style={{ fontSize:22, fontWeight:900, lineHeight:1.1 }}>
                            Rp {((dashboardStats?.total_revenue?.total || totalOmzet) / 1000000).toFixed(1)}jt
                          </div>
                          <div style={{ fontSize:9, opacity:0.7, marginTop:6, lineHeight:1.8 }}>
                            💳 Midtrans: Rp {(dashboardStats?.total_revenue?.midtrans || 0).toLocaleString("id-ID")}<br/>
                            💵 COD: Rp {(dashboardStats?.total_revenue?.cod || 0).toLocaleString("id-ID")}
                          </div>
                          <div style={{ position:"absolute", bottom:16, right:20, fontSize:28, opacity:0.25 }}>📈</div>
                        </div>

                        {/* Order Velocity */}
                        <div style={{ background:"linear-gradient(135deg,#7c3aed 0%,#a78bfa 100%)", borderRadius:16, padding:"20px 24px", position:"relative", overflow:"hidden" }} className="text-white shadow-lg">
                          <div style={{ position:"absolute", top:-20, right:-20, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.08)" }} />
                          <div style={{ fontSize:10, fontWeight:700, opacity:0.7, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Kecepatan Pesanan</div>
                          <div style={{ fontSize:22, fontWeight:900, lineHeight:1.1 }}>
                            {dashboardStats?.order_velocity || 0} <span style={{ fontSize:14 }}>pesanan</span>
                          </div>
                          <div style={{ fontSize:9, opacity:0.7, marginTop:6 }}>Masuk dalam 24 jam terakhir</div>
                          <div style={{ position:"absolute", bottom:16, right:20, fontSize:28, opacity:0.25 }}>⚡</div>
                        </div>

                        {/* Active Members */}
                        <div style={{ background:"linear-gradient(135deg,#059669 0%,#34d399 100%)", borderRadius:16, padding:"20px 24px", position:"relative", overflow:"hidden" }} className="text-white shadow-lg">
                          <div style={{ position:"absolute", top:-20, right:-20, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.08)" }} />
                          <div style={{ fontSize:10, fontWeight:700, opacity:0.7, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Anggota Aktif</div>
                          <div style={{ fontSize:22, fontWeight:900, lineHeight:1.1 }}>
                            {dashboardStats?.active_users?.total || uniqueUsers} <span style={{ fontSize:14 }}>KK</span>
                          </div>
                          <div style={{ fontSize:9, opacity:0.7, marginTop:6, lineHeight:1.8 }}>
                            🏘️ Warga: {dashboardStats?.active_users?.warga || 0}<br/>
                            👤 User: {dashboardStats?.active_users?.user || 0}
                          </div>
                          <div style={{ position:"absolute", bottom:16, right:20, fontSize:28, opacity:0.25 }}>👥</div>
                        </div>

                        {/* Critical Stock */}
                        <div style={{
                          background: (dashboardStats?.critical_stock || []).length > 0
                            ? "linear-gradient(135deg,#dc2626 0%,#f87171 100%)"
                            : "linear-gradient(135deg,#065f46 0%,#10b981 100%)",
                          borderRadius:16, padding:"20px 24px", position:"relative", overflow:"hidden"
                        }} className="text-white shadow-lg">
                          <div style={{ position:"absolute", top:-20, right:-20, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.08)" }} />
                          <div style={{ fontSize:10, fontWeight:700, opacity:0.7, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Alert Stok Kritis</div>
                          <div style={{ fontSize:22, fontWeight:900, lineHeight:1.1 }}>
                            {(dashboardStats?.critical_stock || []).length} <span style={{ fontSize:14 }}>barang</span>
                          </div>
                          <div style={{ fontSize:9, opacity:0.7, marginTop:6 }}>
                            {(dashboardStats?.critical_stock || []).length > 0 ? "⚠️ Stok di bawah 5 unit!" : "✅ Semua stok aman"}
                          </div>
                          <div style={{ position:"absolute", bottom:16, right:20, fontSize:28, opacity:0.25 }}>⚠️</div>
                        </div>
                      </div>

                      {/* Revenue Chart */}
                      <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", padding:"24px 28px" }} className="shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 style={{ fontWeight:800, fontSize:14, color:"#0a192f" }}>Tren Penjualan & Transaksi</h3>
                            <p style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>30 hari terakhir</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5" style={{ fontSize:10, color:"#64748b", fontWeight:700 }}>
                              <span style={{ width:12, height:3, background:"linear-gradient(90deg,#0056b3,#3b82f6)", borderRadius:4, display:"inline-block" }} />
                              Omzet (Lunas)
                            </div>
                            <div className="flex items-center gap-1.5" style={{ fontSize:10, color:"#64748b", fontWeight:700 }}>
                              <span style={{ width:12, height:3, background:"#f97316", borderRadius:4, display:"inline-block", opacity:0.7 }} />
                              Jumlah Transaksi
                            </div>
                          </div>
                        </div>
                        {dashboardStats?.trends && dashboardStats.trends.length > 0 ? (() => {
                          const trends = dashboardStats.trends;
                          const svgW = 800; const svgH = 220;
                          const pL = 64; const pR = 20; const pT = 16; const pB = 36;
                          const cW = svgW - pL - pR; const cH = svgH - pT - pB;
                          const maxRev = Math.max(...trends.map((t: any) => t.revenue), 100000);
                          const maxOrd = Math.max(...trends.map((t: any) => t.orders_count), 5);
                          let ptRev = ""; let ptOrd = ""; let areaRev = `${pL},${pT + cH} `;
                          trends.forEach((t: any, i: number) => {
                            const x = pL + (i / Math.max(trends.length - 1, 1)) * cW;
                            const yR = pT + cH - (t.revenue / maxRev) * cH;
                            const yO = pT + cH - (t.orders_count / maxOrd) * cH;
                            ptRev += `${x},${yR} `; ptOrd += `${x},${yO} `;
                            areaRev += i === trends.length - 1 ? `${x},${yR} ${x},${pT + cH}` : `${x},${yR} `;
                          });
                          return (
                            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto">
                              <defs>
                                <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              {[0, 0.25, 0.5, 0.75, 1].map(r => {
                                const y = pT + r * cH;
                                const v = Math.round(maxRev * (1 - r));
                                return (
                                  <g key={r}>
                                    <line x1={pL} y1={y} x2={svgW - pR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                                    <text x={pL - 8} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">
                                      {v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${Math.round(v/1000)}rb` : v}
                                    </text>
                                  </g>
                                );
                              })}
                              <polygon points={areaRev} fill="url(#revGrad2)" />
                              <polyline fill="none" stroke="url(#revLine)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={ptRev} />
                              <defs>
                                <linearGradient id="revLine" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#0056b3" /><stop offset="100%" stopColor="#3b82f6" />
                                </linearGradient>
                              </defs>
                              <polyline fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="5 3" strokeLinecap="round" points={ptOrd} opacity="0.7" />
                              {trends.map((t: any, i: number) => {
                                if (i % 6 !== 0 && i !== trends.length - 1) return null;
                                const x = pL + (i / Math.max(trends.length - 1, 1)) * cW;
                                const parts = t.date.split("-");
                                return (
                                  <g key={i}>
                                    <line x1={x} y1={pT + cH} x2={x} y2={pT + cH + 4} stroke="#e2e8f0" strokeWidth="1" />
                                    <text x={x} y={pT + cH + 15} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">
                                      {parts.length === 3 ? `${parts[2]}/${parts[1]}` : t.date}
                                    </text>
                                  </g>
                                );
                              })}
                            </svg>
                          );
                        })() : (
                          <div style={{ padding:"40px 0", textAlign:"center", color:"#94a3b8", fontSize:12 }}>
                            Belum ada data transaksi untuk ditampilkan dalam grafik.
                          </div>
                        )}
                      </div>

                      {/* Critical Stock Table */}
                      <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0" }} className="shadow-sm overflow-hidden">
                        <div style={{ background:"linear-gradient(90deg,#fef2f2,#fff7ed)", borderBottom:"1px solid #fecaca", padding:"16px 24px" }} className="flex items-center justify-between">
                          <h3 style={{ fontWeight:800, fontSize:13, color:"#991b1b", display:"flex", alignItems:"center", gap:8 }}>⚠️ Safety Stock Alert — Stok Kritis</h3>
                          <span style={{ background:"#fee2e2", color:"#991b1b", fontSize:9, fontWeight:900, padding:"4px 10px", borderRadius:20, textTransform:"uppercase", letterSpacing:"0.05em" }}>Stok &lt; 5 Unit</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr style={{ background:"#fafafa", borderBottom:"1px solid #f1f5f9" }}>
                                {["Barang","Kategori","Harga Dasar","Sisa Stok","Aksi"].map(h => (
                                  <th key={h} style={{ padding:"10px 16px", fontSize:10, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(dashboardStats?.critical_stock || []).map((p: Product) => (
                                <tr key={p.id} style={{ borderBottom:"1px solid #f8fafc" }} className="hover:bg-red-50/30 transition">
                                  <td style={{ padding:"12px 16px", fontWeight:700, color:"#1e293b" }}>{p.name}</td>
                                  <td style={{ padding:"12px 16px", color:"#64748b" }}>{p.category}</td>
                                  <td style={{ padding:"12px 16px", fontWeight:600 }}>Rp {p.price.toLocaleString("id-ID")}</td>
                                  <td style={{ padding:"12px 16px" }}>
                                    <span style={{ background:"#fee2e2", color:"#dc2626", padding:"2px 10px", borderRadius:20, fontWeight:900, fontSize:10 }} className="animate-pulse">{p.stock} pcs</span>
                                  </td>
                                  <td style={{ padding:"12px 16px" }}>
                                    <button onClick={() => openEditProductModal(p)} style={{ background:"#eff6ff", color:"#2563eb", border:"1px solid #bfdbfe", borderRadius:8, padding:"4px 12px", fontSize:10, fontWeight:700, cursor:"pointer" }}>
                                      ✏️ Tambah Stok
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {(dashboardStats?.critical_stock || []).length === 0 && (
                                <tr><td colSpan={5} style={{ padding:"32px 0", textAlign:"center", color:"#22c55e", fontWeight:700, fontSize:13 }}>✅ Semua stok aman!</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── TAB 2: USERS ─────────────────────────────────────── */}
                  {adminTab === "users" && (
                    <div className="animate-fade-in-up flex flex-col gap-5">
                      <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0" }} className="shadow-sm overflow-hidden">
                        <div style={{ borderBottom:"1px solid #f1f5f9", padding:"20px 24px" }} className="flex items-center justify-between">
                          <div>
                            <h3 style={{ fontWeight:800, fontSize:14, color:"#0a192f" }}>Manajemen Akun KopeRT</h3>
                            <p style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>Ubah peran keanggotaan (Role) dan tier diskon loyalitas warga secara langsung.</p>
                          </div>
                          <div style={{ background:"#f1f5f9", padding:"6px 14px", borderRadius:10, fontSize:11, fontWeight:700, color:"#475569" }}>
                            {adminUsers.length} akun terdaftar
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr style={{ background:"#fafafa", borderBottom:"1px solid #f1f5f9" }}>
                                {["Pengguna","Kontak & Email","NIK","Role","Tier Diskon","Poin / Stamp","Aksi"].map(h => (
                                  <th key={h} style={{ padding:"10px 16px", fontSize:10, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {adminUsers.map((u) => (
                                <tr key={u.id} style={{ borderBottom:"1px solid #f8fafc" }} className="hover:bg-slate-50/60 transition">
                                  <td style={{ padding:"14px 16px" }}>
                                    <div className="flex items-center gap-3">
                                      <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:13, flexShrink:0 }}>
                                        {u.nama?.[0]?.toUpperCase()}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight:700, fontSize:12, color:"#1e293b" }}>{u.nama}</div>
                                        <div style={{ fontSize:10, color:"#94a3b8" }}>@{u.username}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ padding:"14px 16px" }}>
                                    <div style={{ fontSize:12, fontWeight:600, color:"#334155" }}>{u.phone_number}</div>
                                    <div style={{ fontSize:10, color:"#94a3b8" }}>{u.email}</div>
                                  </td>
                                  <td style={{ padding:"14px 16px", fontFamily:"monospace", fontSize:11, color:"#475569", fontWeight:700 }}>{u.nik || "—"}</td>
                                  <td style={{ padding:"14px 16px" }}>
                                    <select
                                      value={u.role}
                                      onChange={(e) => handleUpdateUserRoleTier(u.id, e.target.value, u.member_tier || "silver")}
                                      style={{ padding:"5px 10px", fontSize:11, fontWeight:700, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, cursor:"pointer", color:"#0a192f" }}
                                    >
                                      <option value="admin">Admin</option>
                                      <option value="warga">Warga</option>
                                      <option value="user">User</option>
                                    </select>
                                  </td>
                                  <td style={{ padding:"14px 16px" }}>
                                    <select
                                      value={u.member_tier}
                                      onChange={(e) => handleUpdateUserRoleTier(u.id, u.role, e.target.value)}
                                      style={{ padding:"5px 10px", fontSize:11, fontWeight:700, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, cursor:"pointer", color:"#0a192f" }}
                                    >
                                      <option value="silver">🥈 Silver</option>
                                      <option value="gold">🥇 Gold</option>
                                      <option value="platinum">💎 Platinum</option>
                                    </select>
                                  </td>
                                  <td style={{ padding:"14px 16px" }}>
                                    <div style={{ fontSize:11, fontWeight:700, color:"#3b82f6" }}>{u.points || 0} Poin</div>
                                    <div style={{ fontSize:10, color:"#94a3b8" }}>{u.stamps || 0} Stamp</div>
                                  </td>
                                  <td style={{ padding:"14px 16px" }}>
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      disabled={u.id === currentUser?.id}
                                      style={{ background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca", borderRadius:8, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", opacity: u.id === currentUser?.id ? 0.4 : 1 }}
                                    >
                                      🗑 Hapus
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {adminUsers.length === 0 && (
                                <tr><td colSpan={7} style={{ padding:"40px 0", textAlign:"center", color:"#94a3b8", fontSize:12 }}>Belum ada pengguna terdaftar.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── TAB 3: NIK WARGA ─────────────────────────────────── */}
                  {adminTab === "warga" && (
                    <div className="animate-fade-in-up flex flex-col gap-5">
                      {/* Header Card */}
                      <div style={{ background:"linear-gradient(135deg,#0a192f,#0d2a4a)", borderRadius:16, padding:"24px 28px", color:"#fff", position:"relative", overflow:"hidden" }} className="shadow-lg">
                        <div style={{ position:"absolute", top:-30, right:-30, width:150, height:150, borderRadius:"50%", background:"rgba(59,130,246,0.1)" }} />
                        <h3 style={{ fontWeight:900, fontSize:16, marginBottom:6 }}>🔑 Pendataan NIK & Token Warga RT</h3>
                        <p style={{ fontSize:11, opacity:0.6, lineHeight:1.6 }}>Ketua RT mendata NIK warga secara bulk atau satuan. Sistem akan menerbitkan Token Alphanumeric 8-karakter unik secara otomatis untuk setiap NIK.</p>
                        <div className="flex gap-4 mt-4">
                          <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:10, padding:"10px 16px", textAlign:"center" }}>
                            <div style={{ fontSize:20, fontWeight:900 }}>{wargaList.length}</div>
                            <div style={{ fontSize:9, opacity:0.6 }}>NIK Terdaftar</div>
                          </div>
                          <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:10, padding:"10px 16px", textAlign:"center" }}>
                            <div style={{ fontSize:20, fontWeight:900 }}>{wargaList.filter(w => !w.is_used).length}</div>
                            <div style={{ fontSize:9, opacity:0.6 }}>Token Unused</div>
                          </div>
                          <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:10, padding:"10px 16px", textAlign:"center" }}>
                            <div style={{ fontSize:20, fontWeight:900 }}>{wargaList.filter(w => w.is_used).length}</div>
                            <div style={{ fontSize:9, opacity:0.6 }}>Token Dipakai</div>
                          </div>
                        </div>
                      </div>

                      {/* Bulk Input Form */}
                      <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", padding:"24px 28px" }} className="shadow-sm">
                        <h4 style={{ fontWeight:800, fontSize:13, color:"#0a192f", marginBottom:4 }}>Tambah NIK Baru (Bulk / Satuan)</h4>
                        <p style={{ fontSize:11, color:"#94a3b8", marginBottom:16 }}>Pisahkan beberapa NIK dengan koma atau baris baru untuk pendaftaran massal.</p>
                        <form onSubmit={handleBulkCreateNiks} className="flex flex-col gap-3">
                          <textarea
                            rows={4}
                            placeholder={"Contoh:\n3273123456789012, 3273123456789013\n3273123456789014"}
                            value={bulkNiksInput}
                            onChange={(e) => setBulkNiksInput(e.target.value)}
                            required
                            style={{ width:"100%", padding:"12px 16px", borderRadius:10, border:"1px solid #e2e8f0", fontSize:12, fontFamily:"monospace", resize:"vertical", outline:"none", color:"#0a192f", background:"#fafafa" }}
                          />
                          {wargaError && (
                            <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderLeft:"4px solid #dc2626", borderRadius:8, padding:"10px 14px", color:"#dc2626", fontSize:11, fontWeight:700 }}>⚠️ {wargaError}</div>
                          )}
                          {wargaSuccess && (
                            <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderLeft:"4px solid #22c55e", borderRadius:8, padding:"10px 14px", color:"#15803d", fontSize:11, fontWeight:700 }}>✅ {wargaSuccess}</div>
                          )}
                          <div className="flex justify-end">
                            <button type="submit" style={{ background:"linear-gradient(135deg,#ff6b00,#ff8c00)", color:"#fff", border:"none", borderRadius:10, padding:"11px 24px", fontSize:12, fontWeight:800, cursor:"pointer", boxShadow:"0 4px 12px rgba(255,107,0,0.3)" }}>
                              ➕ Daftarkan NIK & Terbitkan Token
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* NIK Table */}
                      <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0" }} className="shadow-sm overflow-hidden">
                        <div style={{ borderBottom:"1px solid #f1f5f9", padding:"16px 24px" }}>
                          <h4 style={{ fontWeight:800, fontSize:13, color:"#0a192f" }}>Tabel Pelacak Status Token Verifikasi</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr style={{ background:"#fafafa", borderBottom:"1px solid #f1f5f9" }}>
                                {["NIK Warga","Token Unik","Status","Tanggal Terbit","Aksi"].map(h => (
                                  <th key={h} style={{ padding:"10px 16px", fontSize:10, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {wargaList.map((w) => (
                                <tr key={w.id} style={{ borderBottom:"1px solid #f8fafc" }} className="hover:bg-slate-50/50 transition">
                                  <td style={{ padding:"14px 16px", fontFamily:"monospace", fontWeight:700, fontSize:12, color:"#1e293b", letterSpacing:"0.05em" }}>{w.nik}</td>
                                  <td style={{ padding:"14px 16px" }}>
                                    <div className="flex items-center gap-2">
                                      <span style={{ background:"#f1f5f9", padding:"4px 12px", borderRadius:8, fontFamily:"monospace", fontWeight:900, fontSize:13, color:"#1e293b", letterSpacing:"0.1em" }}>{w.token}</span>
                                      <button
                                        type="button"
                                        onClick={() => { navigator.clipboard.writeText(w.token); setWargaSuccess(`Token ${w.token} disalin!`); setTimeout(() => setWargaSuccess(""), 3000); }}
                                        style={{ fontSize:10, color:"#3b82f6", fontWeight:700, cursor:"pointer", background:"none", border:"none", textDecoration:"underline" }}
                                      >Salin</button>
                                    </div>
                                  </td>
                                  <td style={{ padding:"14px 16px" }}>
                                    <span style={{
                                      background: w.is_used ? "#f1f5f9" : "#f0fdf4",
                                      color: w.is_used ? "#64748b" : "#15803d",
                                      border: `1px solid ${w.is_used ? "#e2e8f0" : "#bbf7d0"}`,
                                      padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:800
                                    }}>
                                      {w.is_used ? "✓ Terpakai" : "● Tersedia"}
                                    </span>
                                  </td>
                                  <td style={{ padding:"14px 16px", fontSize:11, color:"#64748b" }}>
                                    {new Date(w.created_at).toLocaleDateString("id-ID", { year:"numeric", month:"short", day:"numeric" })}
                                  </td>
                                  <td style={{ padding:"14px 16px" }}>
                                    <button
                                      onClick={() => handleDeleteWargaVerification(w.id)}
                                      type="button"
                                      style={{ background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca", borderRadius:8, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer" }}
                                    >🗑 Hapus</button>
                                  </td>
                                </tr>
                              ))}
                              {wargaList.length === 0 && (
                                <tr><td colSpan={5} style={{ padding:"40px 0", textAlign:"center", color:"#94a3b8", fontSize:12 }}>Belum ada NIK warga terdaftar. Mulai tambahkan di atas!</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── TAB 4: PRODUCTS ──────────────────────────────────── */}
                  {adminTab === "products" && (() => {
                    const [prodSearch, setProdSearch] = [productSearchQuery, setProductSearchQuery];
                    const [catFilter, setCatFilter] = [productCategoryFilter, setProductCategoryFilter];
                    const categories = ["Semua", ...Array.from(new Set(products.map(p => p.category)))];
                    const filtered = products.filter(p => {
                      const matchCat = catFilter === "Semua" || p.category === catFilter;
                      const matchQ = p.name.toLowerCase().includes(prodSearch.toLowerCase());
                      return matchCat && matchQ;
                    });
                    return (
                    <div className="animate-fade-in-up flex flex-col gap-4">

                      {/* Toolbar */}
                      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e2e8f0", padding:"14px 20px" }} className="flex flex-wrap items-center gap-3 shadow-sm">
                        <div style={{ flex:1, minWidth:180 }}>
                          <div style={{ position:"relative" }}>
                            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#94a3b8", pointerEvents:"none" }}>🔍</span>
                            <input
                              type="text"
                              placeholder="Cari nama barang..."
                              value={prodSearch}
                              onChange={e => setProdSearch(e.target.value)}
                              style={{ width:"100%", paddingLeft:36, paddingRight:12, paddingTop:8, paddingBottom:8, borderRadius:9, border:"1px solid #e2e8f0", fontSize:12, outline:"none", background:"#f8fafc", color:"#0a192f", boxSizing:"border-box" }}
                            />
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {categories.map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setCatFilter(cat)}
                              style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer", border:"1px solid",
                                background: catFilter === cat ? "#0056b3" : "#f8fafc",
                                color: catFilter === cat ? "#fff" : "#64748b",
                                borderColor: catFilter === cat ? "#0056b3" : "#e2e8f0",
                                transition:"all 0.15s"
                              }}
                            >{cat}</button>
                          ))}
                        </div>
                        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontSize:11, color:"#94a3b8", fontWeight:600 }}>{filtered.length} barang</span>
                          <button
                            onClick={openAddProductModal}
                            type="button"
                            style={{ background:"linear-gradient(135deg,#0056b3,#3b82f6)", color:"#fff", border:"none", borderRadius:9, padding:"8px 18px", fontSize:12, fontWeight:800, cursor:"pointer", whiteSpace:"nowrap", boxShadow:"0 4px 12px rgba(0,86,179,0.25)" }}
                          >➕ Tambah Baru</button>
                        </div>
                      </div>

                      {/* Product Cards Grid */}
                      {filtered.length > 0 ? (
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:14 }}>
                          {filtered.map(p => (
                            <div key={p.id} style={{ background:"#fff", borderRadius:14, border:"1px solid #e2e8f0", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", transition:"box-shadow 0.2s", display:"flex", flexDirection:"column" }}
                              className="hover:shadow-md"
                            >
                              {/* Image */}
                              <div style={{ height:130, overflow:"hidden", background:"#f8fafc", flexShrink:0, position:"relative" }}>
                                <img src={getProductImageUrl(p)} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                                {/* Category badge overlay */}
                                <span style={{ position:"absolute", top:8, left:8, fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.05em", padding:"2px 8px", borderRadius:12, backdropFilter:"blur(4px)" }} className={getCategoryBadgeClass(p.category)}>{p.category}</span>
                                {/* Stock badge overlay */}
                                <span style={{ position:"absolute", top:8, right:8, fontSize:9, fontWeight:900, padding:"2px 8px", borderRadius:12,
                                  background: p.stock <= 0 ? "rgba(220,38,38,0.9)" : p.stock < 5 ? "rgba(234,179,8,0.9)" : "rgba(22,163,74,0.9)",
                                  color:"#fff"
                                }} className={p.stock < 5 && p.stock > 0 ? "animate-pulse" : ""}>{p.stock} pcs</span>
                              </div>
                              {/* Info */}
                              <div style={{ padding:"12px 14px", flex:1, display:"flex", flexDirection:"column", gap:4 }}>
                                <div style={{ fontWeight:800, fontSize:12, color:"#1e293b", lineHeight:1.3 }} title={p.name}>
                                  {p.name.length > 30 ? p.name.slice(0, 30) + "…" : p.name}
                                </div>
                                <div style={{ fontSize:13, fontWeight:900, color:"#0056b3", marginTop:2 }}>Rp {p.price.toLocaleString("id-ID")}</div>
                                {p.desc && (
                                  <div style={{ fontSize:10, color:"#94a3b8", lineHeight:1.4, marginTop:2, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{p.desc}</div>
                                )}
                              </div>
                              {/* Actions */}
                              <div style={{ borderTop:"1px solid #f1f5f9", padding:"10px 14px", display:"flex", gap:8 }}>
                                <button onClick={() => openEditProductModal(p)} type="button"
                                  style={{ flex:1, background:"#eff6ff", color:"#2563eb", border:"1px solid #bfdbfe", borderRadius:8, padding:"6px 0", fontSize:11, fontWeight:700, cursor:"pointer" }}
                                >✏️ Edit</button>
                                <button onClick={() => handleDeleteProduct(p.id)} type="button"
                                  style={{ flex:1, background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca", borderRadius:8, padding:"6px 0", fontSize:11, fontWeight:700, cursor:"pointer" }}
                                >🗑 Hapus</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ background:"#fff", borderRadius:14, border:"1px dashed #e2e8f0", padding:"48px 0", textAlign:"center" }}>
                          <div style={{ fontSize:32, marginBottom:8 }}>📦</div>
                          <div style={{ fontSize:13, fontWeight:700, color:"#94a3b8" }}>{products.length === 0 ? "Belum ada barang di database." : "Tidak ada barang yang cocok dengan pencarian."}</div>
                        </div>
                      )}
                    </div>
                    );
                  })()}

                  {/* ── TAB 5: LOGISTICS & COD ───────────────────────────── */}
                  {adminTab === "logistics" && (
                    <div className="animate-fade-in-up grid grid-cols-1 xl:grid-cols-3 gap-6">
                      {/* Pipeline Table */}
                      <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0" }} className="xl:col-span-2 shadow-sm overflow-hidden flex flex-col">
                        <div style={{ borderBottom:"1px solid #f1f5f9", padding:"20px 24px" }}>
                          <h3 style={{ fontWeight:800, fontSize:14, color:"#0a192f" }}>Pipeline Pengiriman & Pembayaran</h3>
                          <p style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>Kelola status pembayaran dan pengiriman semua pesanan warga secara langsung.</p>
                        </div>
                        <div className="overflow-x-auto flex-1">
                          <table className="w-full text-left">
                            <thead>
                              <tr style={{ background:"#fafafa", borderBottom:"1px solid #f1f5f9" }}>
                                {["ID Pesanan","Warga","Metode","Pembayaran","Status Kirim"].map(h => (
                                  <th key={h} style={{ padding:"10px 16px", fontSize:10, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {orders.map((o) => (
                                <tr key={o.id} style={{ borderBottom:"1px solid #f8fafc" }} className="hover:bg-slate-50/50 transition">
                                  <td style={{ padding:"12px 16px", fontFamily:"monospace", fontSize:11, fontWeight:700, color:"#475569" }}>{o.order_id}</td>
                                  <td style={{ padding:"12px 16px", fontWeight:700, fontSize:12, color:"#1e293b" }}>{o.user.nama}</td>
                                  <td style={{ padding:"12px 16px" }}>
                                    <span style={{
                                      background: o.shipping_method === "delivery" ? "#fef9c3" : "#eff6ff",
                                      color: o.shipping_method === "delivery" ? "#854d0e" : "#1d4ed8",
                                      padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:800
                                    }}>{o.shipping_method === "delivery" ? "🛵 Antar" : "🏪 Ambil"}</span>
                                  </td>
                                  <td style={{ padding:"12px 16px" }}>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span style={{
                                        background: o.payment_method === "cod" ? "#f3e8ff" : "#f0fdfa",
                                        color: o.payment_method === "cod" ? "#7c3aed" : "#0d9488",
                                        padding:"3px 8px", borderRadius:20, fontSize:10, fontWeight:800
                                      }}>{o.payment_method === "cod" ? "💵 COD" : "💳 Online"}</span>
                                      <select
                                        value={o.payment_status}
                                        onChange={(e) => handleAdminUpdateStatus(o.order_id, { payment_status: e.target.value })}
                                        style={{ padding:"3px 8px", fontSize:10, fontWeight:700, borderRadius:8, border:"1px solid #e2e8f0", background: o.payment_status === "paid" ? "#f0fdf4" : "#fef9c3", color: o.payment_status === "paid" ? "#15803d" : "#854d0e", cursor:"pointer" }}
                                      >
                                        <option value="pending">Pending</option>
                                        <option value="paid">Lunas</option>
                                        <option value="failed">Gagal</option>
                                        <option value="expired">Expired</option>
                                      </select>
                                    </div>
                                  </td>
                                  <td style={{ padding:"12px 16px" }}>
                                    <select
                                      value={o.shipping_status}
                                      onChange={(e) => handleAdminUpdateStatus(o.order_id, { shipping_status: e.target.value })}
                                      style={{ padding:"5px 10px", fontSize:10, fontWeight:700, borderRadius:8, border:"1px solid #e2e8f0", cursor:"pointer",
                                        background: o.shipping_status === "selesai" ? "#eff6ff" : o.shipping_status === "sedang_diantar" ? "#fffbeb" : o.shipping_status === "siap_diambil" ? "#f0fdf4" : "#fafafa",
                                        color: o.shipping_status === "selesai" ? "#1d4ed8" : o.shipping_status === "sedang_diantar" ? "#92400e" : o.shipping_status === "siap_diambil" ? "#15803d" : "#475569"
                                      }}
                                    >
                                      <option value="proses">⚙️ Diproses</option>
                                      <option value="siap_diambil">✅ Siap Diambil</option>
                                      <option value="sedang_diantar">🛵 Sedang Diantar</option>
                                      <option value="selesai">🏁 Selesai</option>
                                    </select>
                                  </td>
                                </tr>
                              ))}
                              {orders.length === 0 && (
                                <tr><td colSpan={5} style={{ padding:"40px 0", textAlign:"center", color:"#94a3b8", fontSize:12 }}>Belum ada pesanan terdaftar.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* COD Verification Card */}
                      <div style={{ background:"linear-gradient(160deg,#0a192f,#0d2a4a)", borderRadius:16, padding:"28px 24px" }} className="shadow-lg flex flex-col gap-5 text-white">
                        <div className="text-center">
                          <div style={{ fontSize:42, marginBottom:12 }}>🚚</div>
                          <h3 style={{ fontWeight:900, fontSize:15 }}>Verifikasi COD Lapangan</h3>
                          <p style={{ fontSize:11, opacity:0.5, marginTop:6, lineHeight:1.6 }}>Kurir memasukkan PIN 6-digit warga untuk menyelesaikan transaksi COD dan menandai pesanan sebagai Lunas & Selesai secara otomatis.</p>
                        </div>
                        <form onSubmit={handleVerifyCodPin} className="flex flex-col gap-4">
                          <div>
                            <label style={{ fontSize:9, fontWeight:800, opacity:0.5, textTransform:"uppercase", letterSpacing:"0.15em", display:"block", marginBottom:8 }}>Pilih Pesanan COD Pending</label>
                            <select
                              value={codOrderId}
                              onChange={(e) => setCodOrderId(e.target.value)}
                              required
                              style={{ width:"100%", padding:"10px 14px", fontSize:11, fontWeight:700, borderRadius:10, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.08)", color:"#fff", cursor:"pointer", outline:"none" }}
                            >
                              <option value="" style={{ color:"#000" }}>-- Pilih Pesanan COD --</option>
                              {orders.filter(o => o.payment_method === "cod" && o.payment_status === "pending").map(o => (
                                <option key={o.id} value={o.order_id} style={{ color:"#000" }}>
                                  {o.order_id} — {o.user.nama} (Rp {parseFloat(o.total_price).toLocaleString("id-ID")})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize:9, fontWeight:800, opacity:0.5, textTransform:"uppercase", letterSpacing:"0.15em", display:"block", marginBottom:8 }}>PIN 6-Digit Warga</label>
                            <input
                              type="password"
                              maxLength={6}
                              placeholder="••••••"
                              value={codPinInput}
                              onChange={(e) => setCodPinInput(e.target.value.replace(/\D/g, ""))}
                              required
                              style={{ width:"100%", padding:"12px 14px", fontSize:20, fontWeight:900, borderRadius:10, border:"1px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.1)", color:"#fff", textAlign:"center", letterSpacing:"0.4em", outline:"none", boxSizing:"border-box" }}
                            />
                          </div>
                          {codPinError && (
                            <div style={{ background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8, padding:"8px 12px", color:"#fca5a5", fontSize:11, fontWeight:700 }}>⚠️ {codPinError}</div>
                          )}
                          {codPinSuccess && (
                            <div style={{ background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:8, padding:"8px 12px", color:"#86efac", fontSize:11, fontWeight:700 }}>✅ {codPinSuccess}</div>
                          )}
                          <button
                            type="submit"
                            style={{ background:"linear-gradient(135deg,#ff6b00,#ff8c00)", color:"#fff", border:"none", borderRadius:10, padding:"13px 0", fontSize:13, fontWeight:900, cursor:"pointer", boxShadow:"0 4px 16px rgba(255,107,0,0.4)", letterSpacing:"0.03em" }}
                          >
                            🔒 Konfirmasi PIN COD
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* ── TAB 6: FINANCIAL ─────────────────────────────────── */}
                  {adminTab === "financial" && (() => {
                    const maxRev = Math.max(...financialRecon.map((r: any) => r.total_revenue || 0), 1);
                    const totalMidtrans = financialRecon.reduce((s: number, r: any) => s + (r.midtrans_revenue || 0), 0);
                    const totalCod = financialRecon.reduce((s: number, r: any) => s + (r.cod_revenue || 0), 0);
                    const grandTotal = totalMidtrans + totalCod;
                    const recentDays = financialRecon.slice(0, 14).reverse();
                    return (
                    <div className="animate-fade-in-up flex flex-col gap-5">

                      {/* KPI Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { label:"Total Midtrans", val:totalMidtrans, color:"#2563eb", bg:"linear-gradient(135deg,#dbeafe,#eff6ff)", icon:"💳", sub:"Pembayaran online" },
                          { label:"Total COD Kas", val:totalCod, color:"#7c3aed", bg:"linear-gradient(135deg,#ede9fe,#f5f3ff)", icon:"💵", sub:"Kas tunai lapangan" },
                          { label:"Grand Total", val:grandTotal, color:"#059669", bg:"linear-gradient(135deg,#dcfce7,#f0fdf4)", icon:"💰", sub:"30 hari terakhir" },
                        ].map(({ label, val, color, bg, icon, sub }) => (
                          <div key={label} style={{ background:bg, borderRadius:14, border:`1px solid ${color}22`, padding:"18px 22px" }}>
                            <div style={{ fontSize:10, fontWeight:700, color, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
                              <span>{icon}</span>{label}
                            </div>
                            <div style={{ fontSize:22, fontWeight:900, color }}>{val >= 1000000 ? `Rp ${(val/1000000).toFixed(2)}jt` : `Rp ${val.toLocaleString("id-ID")}`}</div>
                            <div style={{ fontSize:10, color, opacity:0.7, marginTop:4, fontWeight:600 }}>{sub}</div>
                          </div>
                        ))}
                      </div>

                      {/* Split layout: chart + scrollable table */}
                      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

                        {/* Mini Bar Chart — last 14 days */}
                        <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e2e8f0", padding:"20px 18px" }} className="xl:col-span-2 shadow-sm flex flex-col">
                          <div style={{ fontWeight:800, fontSize:13, color:"#0a192f", marginBottom:4 }}>📊 Tren 14 Hari Terakhir</div>
                          <div style={{ fontSize:10, color:"#94a3b8", marginBottom:16, fontWeight:600 }}>Pendapatan harian (Midtrans + COD)</div>
                          <div style={{ flex:1, display:"flex", alignItems:"flex-end", gap:5, minHeight:120 }}>
                            {recentDays.length > 0 ? recentDays.map((r: any, i: number) => {
                              const pct = Math.max((r.total_revenue / maxRev) * 100, 2);
                              const midPct = r.total_revenue > 0 ? (r.midtrans_revenue / r.total_revenue) * pct : 0;
                              const codPct = pct - midPct;
                              const dayLabel = r.date ? r.date.slice(5) : "";
                              return (
                                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, minWidth:0 }} title={`${r.date}\nTotal: Rp ${r.total_revenue.toLocaleString("id-ID")}\nMidtrans: Rp ${r.midtrans_revenue.toLocaleString("id-ID")}\nCOD: Rp ${r.cod_revenue.toLocaleString("id-ID")}`}>
                                  <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:0, borderRadius:"4px 4px 0 0", overflow:"hidden" }}>
                                    <div style={{ width:"100%", height:`${midPct}px`, background:"#3b82f6", minHeight: midPct > 0 ? 2 : 0 }} />
                                    <div style={{ width:"100%", height:`${codPct}px`, background:"#a78bfa", minHeight: codPct > 0 ? 2 : 0 }} />
                                  </div>
                                  <div style={{ fontSize:8, color:"#94a3b8", fontWeight:600, transform:"rotate(-40deg)", whiteSpace:"nowrap", transformOrigin:"top center", marginTop:2 }}>{dayLabel}</div>
                                </div>
                              );
                            }) : (
                              <div style={{ flex:1, textAlign:"center", color:"#94a3b8", fontSize:11, alignSelf:"center" }}>Belum ada data</div>
                            )}
                          </div>
                          <div style={{ display:"flex", gap:12, marginTop:16, justifyContent:"center" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, color:"#64748b", fontWeight:700 }}>
                              <div style={{ width:10, height:10, borderRadius:2, background:"#3b82f6" }} /> Midtrans
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, color:"#64748b", fontWeight:700 }}>
                              <div style={{ width:10, height:10, borderRadius:2, background:"#a78bfa" }} /> COD
                            </div>
                          </div>
                        </div>

                        {/* Reconciliation Table — fixed height scroll */}
                        <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e2e8f0" }} className="xl:col-span-3 shadow-sm overflow-hidden flex flex-col">
                          <div style={{ borderBottom:"1px solid #f1f5f9", padding:"16px 20px", flexShrink:0 }} className="flex items-center justify-between">
                            <div>
                              <h3 style={{ fontWeight:800, fontSize:13, color:"#0a192f" }}>🪙 Rekonsiliasi Harian</h3>
                              <p style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>30 hari terakhir · scroll untuk lihat lebih</p>
                            </div>
                            <span style={{ fontSize:10, fontWeight:700, color:"#64748b", background:"#f1f5f9", padding:"3px 10px", borderRadius:20 }}>{financialRecon.length} hari</span>
                          </div>
                          {/* Sticky header + scrollable body */}
                          <div style={{ overflowY:"auto", maxHeight:340 }}>
                            <table className="w-full text-left" style={{ borderCollapse:"collapse" }}>
                              <thead style={{ position:"sticky", top:0, zIndex:2 }}>
                                <tr style={{ background:"#f8fafc", borderBottom:"1px solid #e2e8f0" }}>
                                  {["Tanggal","💳 Midtrans","💵 COD","Total","Status"].map(h => (
                                    <th key={h} style={{ padding:"8px 14px", fontSize:9, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {financialRecon.map((r: any, idx: number) => (
                                  <tr key={r.date} style={{ borderBottom:"1px solid #f8fafc", background: idx % 2 === 0 ? "#fff" : "#fafafa" }} className="hover:bg-blue-50/30 transition">
                                    <td style={{ padding:"9px 14px", fontSize:11, fontWeight:700, color:"#475569", whiteSpace:"nowrap" }}>{r.date}</td>
                                    <td style={{ padding:"9px 14px", fontSize:11, fontWeight:700, color:"#2563eb" }}>
                                      {r.midtrans_revenue > 0 ? `Rp ${r.midtrans_revenue >= 1000000 ? (r.midtrans_revenue/1000000).toFixed(1)+"jt" : r.midtrans_revenue.toLocaleString("id-ID")}` : <span style={{ color:"#cbd5e1" }}>—</span>}
                                    </td>
                                    <td style={{ padding:"9px 14px", fontSize:11, fontWeight:700, color:"#7c3aed" }}>
                                      {r.cod_revenue > 0 ? `Rp ${r.cod_revenue >= 1000000 ? (r.cod_revenue/1000000).toFixed(1)+"jt" : r.cod_revenue.toLocaleString("id-ID")}` : <span style={{ color:"#cbd5e1" }}>—</span>}
                                    </td>
                                    <td style={{ padding:"9px 14px", fontSize:12, fontWeight:900, color: r.total_revenue > 0 ? "#059669" : "#94a3b8" }}>
                                      {r.total_revenue > 0 ? `Rp ${r.total_revenue >= 1000000 ? (r.total_revenue/1000000).toFixed(1)+"jt" : r.total_revenue.toLocaleString("id-ID")}` : "—"}
                                    </td>
                                    <td style={{ padding:"9px 14px" }}>
                                      <span style={{ background: r.total_revenue > 0 ? "#f0fdf4" : "#f8fafc", color: r.total_revenue > 0 ? "#15803d" : "#94a3b8", padding:"2px 8px", borderRadius:20, fontSize:9, fontWeight:800, whiteSpace:"nowrap" }}>
                                        {r.total_revenue > 0 ? "✓ Reconciled" : "○ Kosong"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {financialRecon.length === 0 && (
                                  <tr><td colSpan={5} style={{ padding:"40px 0", textAlign:"center", color:"#94a3b8", fontSize:12 }}>Belum ada data rekonsiliasi.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Loyalty Audit Log — fixed height */}
                      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e2e8f0" }} className="shadow-sm overflow-hidden flex flex-col">
                        <div style={{ borderBottom:"1px solid #f1f5f9", padding:"16px 20px", flexShrink:0 }} className="flex items-center justify-between">
                          <div>
                            <h3 style={{ fontWeight:800, fontSize:13, color:"#0a192f" }}>🎖️ Log Audit Poin & Stamp</h3>
                            <p style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>Riwayat distribusi loyalitas kepada warga · scroll untuk lihat lebih</p>
                          </div>
                          <span style={{ fontSize:10, fontWeight:700, color:"#64748b", background:"#f1f5f9", padding:"3px 10px", borderRadius:20 }}>{loyaltyLogs.length} transaksi</span>
                        </div>
                        <div style={{ overflowY:"auto", maxHeight:320 }}>
                          <table className="w-full text-left" style={{ borderCollapse:"collapse" }}>
                            <thead style={{ position:"sticky", top:0, zIndex:2 }}>
                              <tr style={{ background:"#f8fafc", borderBottom:"1px solid #e2e8f0" }}>
                                {["Warga","NIK","ID Pesanan","Nominal","Poin","Stamp","Waktu"].map(h => (
                                  <th key={h} style={{ padding:"8px 14px", fontSize:9, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {loyaltyLogs.map((log: any, idx: number) => (
                                <tr key={log.id} style={{ borderBottom:"1px solid #f8fafc", background: idx % 2 === 0 ? "#fff" : "#fafafa" }} className="hover:bg-amber-50/30 transition">
                                  <td style={{ padding:"9px 14px", fontWeight:700, fontSize:12, color:"#1e293b", whiteSpace:"nowrap" }}>{log.user_nama}</td>
                                  <td style={{ padding:"9px 14px", fontFamily:"monospace", fontSize:10, color:"#64748b" }}>{log.user_nik || "—"}</td>
                                  <td style={{ padding:"9px 14px", fontFamily:"monospace", fontSize:10, fontWeight:700, color:"#2563eb" }}>{log.order_id_code}</td>
                                  <td style={{ padding:"9px 14px", fontSize:11, fontWeight:700, color:"#1e293b" }}>Rp {parseFloat(log.amount).toLocaleString("id-ID")}</td>
                                  <td style={{ padding:"9px 14px" }}>
                                    <span style={{ background:"#eff6ff", color:"#2563eb", padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:900 }}>+{log.points_earned} Pts</span>
                                  </td>
                                  <td style={{ padding:"9px 14px" }}>
                                    <span style={{ background:"#fff7ed", color:"#ea580c", padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:900 }}>+{log.stamps_earned} ⭐</span>
                                  </td>
                                  <td style={{ padding:"9px 14px", fontSize:10, color:"#94a3b8", whiteSpace:"nowrap" }}>{new Date(log.created_at).toLocaleString("id-ID", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</td>
                                </tr>
                              ))}
                              {loyaltyLogs.length === 0 && (
                                <tr><td colSpan={7} style={{ padding:"40px 0", textAlign:"center", color:"#94a3b8", fontSize:12 }}>Belum ada log audit loyalitas.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                    );
                  })()}

                </div>{/* end .flex-1 p-8 */}
              </main>{/* end main content */}
            </div>{/* end admin-dashboard flex */}
          </ScrollReveal>
        </main>
      ) : showOrdersHistory ? (
        /* USER ORDERS HISTORY PAGE */
        <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col gap-10">
          <ScrollReveal animation="fade-in">
            <div className="rounded-3xl p-8 nm-flat bg-white border border-white/60">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-black text-brand-navy">Riwayat Belanja Anda</h3>
                  <p className="text-xs text-zinc-500">Daftar pesanan sembako dan ATK warga</p>
                </div>
                <button 
                  onClick={() => setShowOrdersHistory(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#f0f4f8] nm-button text-brand-navy"
                >
                  🔙 Kembali ke Belanja
                </button>
              </div>

              <div className="flex flex-col gap-6">
                {orders.map((o) => (
                  <div key={o.id} className="p-6 rounded-2xl bg-white nm-flat border border-white/50 flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-brand-navy">{o.order_id}</span>
                        <span className="text-xs text-zinc-400">| {new Date(o.created_at).toLocaleString("id-ID")}</span>
                      </div>
                      
                      {/* Items */}
                      <div className="text-xs text-zinc-600 font-medium">
                        {o.items.map((i) => (
                          <div key={i.id} className="flex gap-2">
                            <span>📦 {i.product_name}</span>
                            <span>({i.quantity}x)</span>
                            <span className="text-zinc-400">@ Rp {parseFloat(i.price).toLocaleString("id-ID")}</span>
                          </div>
                        ))}
                      </div>

                      {o.shipping_method === "delivery" && o.delivery_address && (
                        <div className="text-[11px] text-zinc-500 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100 mt-2">
                          <strong>Alamat Kirim:</strong> {o.delivery_address}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:items-end justify-between gap-4 min-w-[150px]">
                      <div>
                        <div className="text-xs text-zinc-400">Total Transaksi</div>
                        <div className="font-black text-base text-brand-navy">Rp {parseFloat(o.total_price).toLocaleString("id-ID")}</div>
                      </div>

                      <div className="flex gap-2 flex-wrap md:flex-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          o.payment_method === 'cod' ? 'bg-purple-100 text-purple-800' : 'bg-teal-100 text-teal-800'
                        }`}>
                          {o.payment_method === 'cod' ? '💵 COD' : '💳 Midtrans'}
                        </span>

                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          o.shipping_method === 'delivery' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {o.shipping_method === 'delivery' ? '🛵 Antar' : '🏪 Ambil'}
                        </span>

                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          o.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          o.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Status: {o.payment_status === 'paid' ? 'Lunas' : o.payment_status === 'pending' ? 'Belum Bayar' : 'Gagal/Expired'}
                        </span>

                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          o.shipping_status === 'selesai' ? 'bg-indigo-100 text-indigo-800' :
                          o.shipping_status === 'sedang_diantar' ? 'bg-amber-100 text-amber-800' :
                          o.shipping_status === 'siap_diambil' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-zinc-100 text-zinc-800'
                        }`}>
                          Kirim: {o.shipping_status === 'proses' ? 'Diproses' :
                              o.shipping_status === 'siap_diambil' ? 'Siap Diambil' :
                              o.shipping_status === 'sedang_diantar' ? 'Sedang Diantar' : 'Selesai'}
                        </span>
                      </div>

                      {/* Pay Button for Pending Orders (Only for Online/Midtrans orders) */}
                      {o.payment_status === "pending" && o.snap_token && o.payment_method !== "cod" && (
                        <button
                          onClick={() => {
                            if (typeof window !== "undefined" && (window as any).snap) {
                              (window as any).snap.pay(o.snap_token, {
                                onSuccess: () => {
                                  alert("Pembayaran Berhasil!");
                                  fetchOrders();
                                },
                                onPending: () => {
                                  alert("Menunggu Pembayaran.");
                                },
                                onClose: () => {
                                  alert("Halaman pembayaran ditutup.");
                                }
                              });
                            } else {
                              alert("Midtrans SDK error. Hubungi Pengurus.");
                            }
                          }}
                          className="w-full py-2 rounded-xl text-xs font-bold text-white bg-brand-orange hover:bg-brand-orange-light shadow transition"
                        >
                          Bayar Sekarang 💰
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {orders.length === 0 && (
                  <div className="py-16 text-center text-zinc-400">
                    Kamu belum memiliki riwayat transaksi belanja. Yuk, belanja sembako dulu!
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        </main>
      ) : (
        <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col gap-10">
          {/* USER & GUEST LANDING PAGE */}
          <>
            {/* Hero Section */}
            <ScrollReveal animation="fade-in-up">
              <div className="rounded-3xl p-8 nm-flat bg-white border border-white/60 relative overflow-hidden flex flex-col md:flex-row gap-8 items-center">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-3xl"></div>

                <div className="flex-1 flex flex-col gap-4">
                  <div className="inline-flex items-center gap-2 bg-brand-blue/10 text-brand-blue text-xs font-extrabold px-3 py-1 rounded-full w-fit">
                    <span>📢</span> Koperasi RT 04 / RW 02 Online
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-brand-navy leading-tight">
                    Belanja Kebutuhan <br />
                    Warga Kini <span className="text-brand-blue">Lebih Praktis</span>
                  </h2>
                  <p className="text-zinc-600 text-sm md:text-base max-w-md">
                    Pesan sembako segar dan ATK secara online. Dapatkan layanan antar gratis langsung ke teras rumah Anda atau ambil sendiri ke sekretariat Koperasi RT.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <a href="#produk-section" className="px-6 py-3 rounded-full text-sm font-bold bg-brand-orange hover:bg-brand-orange-light text-white shadow-md transition-all">
                    Mulai Belanja
                    </a>
                    {!currentUser && (
                      <>
                        <button 
                          onClick={() => {
                            setAuthMode("register");
                            setErrorMsg("");
                            setShowAuthModal(true);
                          }} 
                          className="px-6 py-3 rounded-full text-sm font-bold bg-white text-brand-navy nm-button"
                        >
                          Daftar Pengunjung
                        </button>
                        <button 
                          onClick={() => {
                            window.location.href = "/register-warga";
                          }} 
                          className="px-6 py-3 rounded-full text-sm font-bold bg-brand-blue hover:bg-brand-blue-light text-white shadow-md transition-all"
                        >
                          Registrasi Warga RT
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-1/2 flex justify-center relative">
                  <div className="relative w-full max-w-[360px] aspect-square rounded-3xl overflow-hidden shadow-lg transition duration-500 hover:scale-105">
                    <img 
                      src="/images/hero_illustration.png" 
                      alt="Aplikasi KopeRT" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/90 via-brand-navy/30 to-transparent flex flex-col justify-end p-6 text-white">
                      <h3 className="font-extrabold text-xl">Aplikasi KopeRT</h3>
                      <p className="text-[11px] text-zinc-200 mt-1">
                        Pesan Sembako, Makanan & Minuman, dan ATK dari HP
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Features Info */}
            <ScrollReveal animation="zoom-in" delay={100}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center max-w-3xl mx-auto w-full">
                <div className="p-6 rounded-2xl bg-white nm-flat border border-white/50 flex flex-col items-center">
                  <span className="text-4xl mb-3">🛵</span>
                  <h4 className="font-bold text-brand-navy">Diantar ke Rumah</h4>
                  <p className="text-xs text-zinc-500 mt-2">
                    Pesanan dikirim langsung oleh kurir RT setempat ke alamat Anda.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-white nm-flat border border-white/50 flex flex-col items-center">
                  <span className="text-4xl mb-3">🏪</span>
                  <h4 className="font-bold text-brand-navy">Ambil Sendiri (Pickup)</h4>
                  <p className="text-xs text-zinc-500 mt-2">
                    Pesan dahulu, ambil pesanan Anda saat pulang kerja di Koperasi.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Categories & Product List */}
            <ScrollReveal animation="fade-in-up" delay={200}>
              <div id="produk-section" className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-brand-navy">Etalase Koperasi RT</h3>
                    <p className="text-xs text-zinc-500">Daftar produk sembako dan ATK terlaris</p>
                  </div>
                  
                  {/* Category Buttons */}
                  <div className="flex gap-2 self-start overflow-x-auto pb-1 max-w-full">
                    {["Semua", ...Array.from(new Set(products.map((p) => p.category)))].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
                          selectedCategory === cat
                            ? "bg-brand-blue text-white shadow-inner"
                            : "bg-white text-brand-navy nm-button"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Bar Mobile */}
                <div className="md:hidden w-full relative">
                  <input
                    type="text"
                    placeholder="Cari sembako, ATK, minyak..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-5 py-3 rounded-full text-sm nm-input text-brand-navy"
                  />
                  <span className="absolute right-4 top-3.5 text-zinc-400">🔍</span>
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredProducts.map((prod) => {
                    const priceInfo = getProductDiscountInfo(prod, currentUser);
                    return (
                      <div 
                        key={prod.id} 
                        className="rounded-2xl p-4 bg-white nm-flat border border-white/50 flex flex-col justify-between hover:scale-[1.02] transition duration-300 group"
                      >
                        <div>
                          <div className="aspect-square rounded-xl bg-brand-navy-light/5 flex items-center justify-center mb-4 transition duration-300 group-hover:scale-105 overflow-hidden relative border border-zinc-100/50 shadow-sm">
                            <img src={getProductImageUrl(prod)} alt={prod.name} className="w-full h-full object-cover" style={getProductImageStyle(prod.name)} />
                            {!prod.image.startsWith("/") && !prod.image.startsWith("http") && (
                              <span className="absolute top-2 right-2 bg-white/85 backdrop-blur-sm w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-sm z-10">
                                {prod.image}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${getCategoryBadgeClass(prod.category)}`}>
                              {prod.category}
                            </span>
                            <span className="text-[10px] text-zinc-400">Stok: {prod.stock}</span>
                          </div>
                          <h4 className="font-bold text-sm text-brand-navy line-clamp-1 group-hover:text-brand-blue transition">
                            {prod.name}
                          </h4>
                          <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                            {prod.desc}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              {priceInfo.discountPercent > 0 && (
                                <span className="text-[9px] font-mono text-zinc-400 line-through">
                                  Rp {priceInfo.originalPrice.toLocaleString("id-ID")}
                                </span>
                              )}
                              <span className="font-black text-sm text-brand-navy">
                                Rp {priceInfo.price.toLocaleString("id-ID")}
                              </span>
                            </div>
                            <button
                              onClick={() => handleAddToCart(prod)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-brand-navy group-hover:bg-brand-orange shadow transition duration-300"
                            >
                              + Beli
                            </button>
                          </div>
                          {priceInfo.discountPercent > 0 && (
                            <span className="text-[9px] font-extrabold text-green-600 bg-green-50 px-1.5 py-0.5 rounded w-fit mt-0.5">
                              Hemat {priceInfo.discountPercent}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredProducts.length === 0 && (
                    <div className="col-span-full py-16 text-center text-zinc-500 font-medium bg-white/40 rounded-2xl border border-dashed border-zinc-200">
                      😅 Produk "{searchQuery}" tidak ditemukan di koperasi.
                    </div>
                  )}
                </div>
              </div>
            </ScrollReveal>
          </>
        </main>
      )}

      {/* Cart Drawer / Sidebar */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-brand-navy/30 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-[#f0f4f8] h-full shadow-2xl p-6 flex flex-col justify-between animate-fade-in-up">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-brand-navy flex items-center gap-2">
                  <span>👜</span> Keranjang Warga
                </h3>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="w-10 h-10 rounded-full nm-button flex items-center justify-center font-bold text-sm text-brand-navy"
                >
                  ✕
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="py-24 text-center text-zinc-400">
                  <span className="text-5xl block mb-4">🛒</span>
                  Keranjang belanja kosong. Yuk, tambahkan sembako atau ATK!
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-h-[55vh] overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const priceInfo = getProductDiscountInfo(item.product, currentUser);
                    return (
                      <div key={item.product.id} className="p-3 rounded-xl bg-white nm-flat border border-white/50 flex gap-3 items-center">
                        <div className="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-zinc-200 shadow-sm relative">
                          <img src={getProductImageUrl(item.product)} alt={item.product.name} className="w-full h-full object-cover" style={getProductImageStyle(item.product.name)} />
                          {!item.product.image.startsWith("/") && !item.product.image.startsWith("http") && (
                            <span className="absolute bottom-0 right-0 bg-white/90 backdrop-blur-sm text-xs w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                              {item.product.image}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-xs text-brand-navy">{item.product.name}</h4>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-zinc-700">Rp {priceInfo.price.toLocaleString("id-ID")}</span>
                            {priceInfo.discountPercent > 0 && (
                              <span className="text-[9px] font-mono text-zinc-400 line-through">Rp {priceInfo.originalPrice.toLocaleString("id-ID")}</span>
                            )}
                          </div>
                        </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => updateCartQty(item.product.id, -1)}
                          className="w-6 h-6 rounded-full nm-button flex items-center justify-center text-xs font-bold"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                        <button 
                          onClick={() => updateCartQty(item.product.id, 1)}
                          className="w-6 h-6 rounded-full nm-button flex items-center justify-center text-xs font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-zinc-200/50 pt-4 flex flex-col gap-4">
                {/* Shipping Method Option - Only for Warga */}
                {currentUser?.role === 'warga' ? (
                  <div>
                    <label className="text-xs font-bold text-brand-navy mb-2 block">Metode Pengiriman:</label>
                    <div className="grid grid-cols-2 gap-3 p-1 bg-zinc-200/50 rounded-xl">
                      <button
                        onClick={() => setShippingMethod("pickup")}
                        className={`py-2 rounded-lg text-xs font-bold transition-all ${
                          shippingMethod === "pickup" ? "bg-white text-brand-navy shadow" : "text-zinc-500"
                        }`}
                      >
                        🏪 Ambil Sendiri
                      </button>
                      <button
                        onClick={() => setShippingMethod("delivery")}
                        className={`py-2 rounded-lg text-xs font-bold transition-all ${
                          shippingMethod === "delivery" ? "bg-white text-brand-navy shadow" : "text-zinc-500"
                        }`}
                      >
                        🛵 Kirim ke Rumah
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 text-blue-800 p-3 rounded-xl text-xs font-bold flex gap-2">
                    <span>📢</span> Metode Pengiriman: Ambil di Koperasi (Khusus Warga RT yang mendapatkan layanan pengantaran ke rumah).
                  </div>
                )}

                {/* Delivery Address Input - Only for Warga choosing Delivery */}
                {currentUser?.role === 'warga' && shippingMethod === "delivery" && (
                  <div className="animate-fade-in-up flex flex-col gap-2">
                    {addresses.length > 0 && (
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                          Alamat Pengiriman Tersimpan
                        </label>
                        <select
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs nm-input text-brand-navy border-none bg-white font-bold"
                          defaultValue={addresses.find(a => a.is_default)?.full_address || ""}
                        >
                          <option value="">-- Pilih Alamat Buku --</option>
                          {addresses.map((addr) => (
                            <option key={addr.id} value={addr.full_address}>
                              [{addr.label}] {addr.recipient_name} - {addr.full_address.substring(0, 30)}...
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                        Detail Alamat Pengiriman (No. Rumah)
                      </label>
                      <textarea
                        placeholder="Masukkan alamat lengkap rumah Anda..."
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Payment Method Option - Only for Warga */}
                {currentUser?.role === 'warga' ? (
                  <div>
                    <label className="text-xs font-bold text-brand-navy mb-2 block">Metode Pembayaran:</label>
                    <div className="grid grid-cols-2 gap-3 p-1 bg-zinc-200/50 rounded-xl">
                      <button
                        onClick={() => setPaymentMethod("midtrans")}
                        type="button"
                        className={`py-2 rounded-lg text-xs font-bold transition-all ${
                          paymentMethod === "midtrans" ? "bg-white text-brand-navy shadow" : "text-zinc-500"
                        }`}
                      >
                        💳 Midtrans (Online)
                      </button>
                      <button
                        onClick={() => setPaymentMethod("cod")}
                        type="button"
                        className={`py-2 rounded-lg text-xs font-bold transition-all ${
                          paymentMethod === "cod" ? "bg-white text-brand-navy shadow" : "text-zinc-500"
                        }`}
                      >
                        💵 COD (Bayar di Tempat)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-xs font-bold flex gap-2">
                    <span>📢</span> Metode Pembayaran: Online via Midtrans (COD khusus untuk Warga RT dengan PIN keamanan).
                  </div>
                )}

                <div className="flex justify-between items-center text-sm font-bold text-brand-navy">
                  <span>Total Pembayaran:</span>
                  <span className="text-base text-brand-orange">
                    Rp {getCartTotal().toLocaleString("id-ID")}
                  </span>
                </div>

                <button 
                  onClick={() => handleCheckout()}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white bg-brand-orange hover:bg-brand-orange-light shadow-md transition-all text-center"
                >
                  {paymentMethod === "cod"
                    ? "🔒 Konfirmasi PIN & Pesan COD"
                    : "🚀 Buat Pesanan Online (Bayar via Midtrans)"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified Login & Registration Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-brand-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#f0f4f8] rounded-3xl p-6 nm-flat border border-white/60 relative animate-fade-in-up overflow-y-auto max-h-[90vh]">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full nm-button flex items-center justify-center font-bold text-xs"
            >
              ✕
            </button>

            {/* Error Notification */}
            {errorMsg && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-xl mb-4 text-xs font-bold flex gap-2">
                <span>⚠️</span> {errorMsg}
              </div>
            )}

            {authMode === "login" ? (
              /* LOGIN FORM */
              <form onSubmit={handleLoginSubmit}>
                <div className="text-center mb-6">
                  <span className="text-4xl block mb-2">🔑</span>
                  <h3 className="text-xl font-bold text-brand-navy">Masuk KopeRT</h3>
                  <p className="text-xs text-zinc-500 mt-1">Silakan masuk menggunakan akun warga Anda</p>
                </div>

                <div className="flex flex-col gap-4 mb-6">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                      Username atau Email
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan username atau email..."
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl text-sm nm-input text-brand-navy"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      placeholder="Masukkan kata sandi..."
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl text-sm nm-input text-brand-navy"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-brand-orange hover:bg-brand-orange-light shadow-md transition text-center"
                >
                  Masuk 🔓
                </button>

                <div className="mt-6 border-t border-zinc-200/50 pt-4 text-center flex flex-col gap-2.5">
                  <p className="text-xs text-zinc-600">
                    Belum punya akun pengunjung?{" "}
                    <button 
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setErrorMsg("");
                      }}
                      className="text-brand-blue font-bold hover:underline"
                    >
                      Daftar Pengunjung
                    </button>
                  </p>
                  <p className="text-xs text-zinc-600">
                    Apakah Anda Warga RT 04?{" "}
                    <button 
                      type="button"
                      onClick={() => {
                        window.location.href = "/register-warga";
                      }}
                      className="text-brand-orange font-bold hover:underline"
                    >
                      Registrasi Akun Warga
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              /* REGISTER FORM */
              <form onSubmit={handleRegisterSubmit}>
                <div className="text-center mb-6">
                  <span className="text-4xl block mb-2">📋</span>
                  <h3 className="text-xl font-bold text-brand-navy">Pendaftaran Pengunjung</h3>
                  <p className="text-xs text-zinc-500 mt-1">Daftar akun pengunjung untuk belanja kebutuhan pokok</p>
                </div>
                <div className="bg-blue-50 text-blue-800 p-3 rounded-xl mb-4 text-[10px] leading-relaxed text-left">
                  ℹ️ Form ini untuk pendaftaran akun pengunjung umum. Jika Anda <strong>Warga RT 04</strong>, silakan lakukan pendaftaran khusus melalui <a href="/register-warga" className="font-bold underline text-brand-blue">Halaman Registrasi Warga</a> untuk mendapatkan diskon belanja warga (4%-8.5%) dan A-Member.
                </div>

                <div className="flex flex-col gap-4 mb-6">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Pak Joko Widodo"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                        Username *
                      </label>
                      <input
                        type="text"
                        placeholder="joko12"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                        Nomor Telpon *
                      </label>
                      <input
                        type="tel"
                        placeholder="0812xxxxxxxx"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                      Alamat Email *
                    </label>
                    <input
                      type="email"
                      placeholder="warga@kope.rt"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                      Kata Sandi *
                    </label>
                    <input
                      type="password"
                      placeholder="Minimal 6 karakter..."
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                      Alamat Rumah (Opsional)
                    </label>
                    <textarea
                      placeholder="Masukkan alamat rumah lengkap atau nomor RT..."
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy resize-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-brand-blue hover:bg-brand-blue-light shadow-md transition text-center"
                >
                  Daftar Akun Baru 🚀
                </button>

                <div className="mt-6 border-t border-zinc-200/50 pt-4 text-center">
                  <p className="text-xs text-zinc-600">
                    Sudah punya akun warga?{" "}
                    <button 
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setErrorMsg("");
                      }}
                      className="text-brand-orange font-bold hover:underline"
                    >
                      Masuk Di Sini
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6-Digit PIN Modal for COD checkout */}
      {showPinModal && (
        <div className="fixed inset-0 bg-brand-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#f0f4f8] rounded-3xl p-6 nm-flat border border-white/60 relative animate-fade-in-up">
            <button 
              onClick={() => setShowPinModal(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full nm-button flex items-center justify-center font-bold text-xs text-brand-navy"
            >
              ✕
            </button>

            <form onSubmit={handleVerifyPinAndCheckout}>
              <div className="text-center mb-6">
                <span className="text-4xl block mb-2">🔒</span>
                <h3 className="text-lg font-bold text-brand-navy">Keamanan Transaksi COD</h3>
                <p className="text-xs text-zinc-500 mt-2">
                  Masukkan 6 digit PIN transaksi Anda untuk mengonfirmasi pesanan COD (Cash on Delivery).
                </p>
              </div>

              {pinError && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-xl mb-4 text-xs font-bold flex gap-2">
                  <span>⚠️</span> {pinError}
                </div>
              )}

              <div className="flex flex-col items-center gap-4 mb-6">
                <input
                  type="password"
                  maxLength={6}
                  placeholder="••••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                  required
                  className="w-48 text-center text-xl tracking-[0.4em] px-4 py-3 rounded-xl nm-input text-brand-navy font-black"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-brand-orange hover:bg-brand-orange-light shadow-md transition text-center"
              >
                Verifikasi PIN & Pesan Sekarang 🚀
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Product Add/Edit Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-brand-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#f0f4f8] rounded-3xl p-6 nm-flat border border-white/60 relative animate-fade-in-up overflow-y-auto max-h-[90vh]">
            <button 
              onClick={() => setShowProductModal(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full nm-button flex items-center justify-center font-bold text-xs text-brand-navy"
            >
              ✕
            </button>

            <form onSubmit={handleProductSubmit}>
              <div className="text-center mb-6">
                <span className="text-4xl block mb-2">{productModalMode === "add" ? "📦" : "✏️"}</span>
                <h3 className="text-xl font-bold text-brand-navy">
                  {productModalMode === "add" ? "Tambah Barang Baru" : "Edit Detail Barang"}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {productModalMode === "add" 
                    ? "Masukkan detail produk untuk ditambahkan ke koperasi"
                    : "Ubah data detail atau stok barang di koperasi"
                  }
                </p>
              </div>

              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                    Nama Barang *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Beras Ramos 5kg"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                      Kategori Barang *
                    </label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-xl text-xs nm-input text-brand-navy border-none bg-white font-bold"
                    >
                      <option value="Sembako">Sembako</option>
                      <option value="Makanan dan Minuman">Makanan dan Minuman</option>
                      <option value="ATK">ATK</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                      Emoji Gambar (Icon) *
                    </label>
                    <select
                      value={prodImage}
                      onChange={(e) => setProdImage(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-xl text-xs nm-input text-brand-navy border-none bg-white font-bold"
                    >
                      <option value="🌾">🌾 Padi/Beras</option>
                      <option value="🥚">🥚 Telur</option>
                      <option value="🧴">🧴 Sabun/Shampo</option>
                      <option value="🧼">🧼 Sabun Batang</option>
                      <option value="🧻">🧻 Tisu</option>
                      <option value="🧂">🧂 Garam/Bumbu</option>
                      <option value="🍜">🍜 Mie Instan</option>
                      <option value="🛢️">🛢️ Minyak/Minyak Goreng</option>
                      <option value="☕">☕ Kopi/Teh</option>
                      <option value="🥛">🥛 Susu</option>
                      <option value="🍬">🍬 Permen/Camilan</option>
                      <option value="🥫">🥫 Sarden/Kaleng</option>
                      <option value="✏️">✏️ Pensil/ATK</option>
                      <option value="📓">📓 Buku Catatan</option>
                      <option value="📐">📐 Penggaris</option>
                      <option value="✂️">✂️ Gunting</option>
                      <option value="📦">📦 Box/Paket</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                      Harga Barang (Rp) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Contoh: 15000"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                      Stok Barang *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Contoh: 50"
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5">
                    Deskripsi Barang
                  </label>
                  <textarea
                    placeholder="Contoh: Beras ramos putih wangi kualitas premium ukuran 5kg..."
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl text-xs nm-input text-brand-navy resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-zinc-600 bg-white nm-button text-center"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-white bg-brand-orange hover:bg-brand-orange-light shadow-md transition text-center"
                >
                  {productModalMode === "add" ? "Tambah Barang" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      {userRole !== "admin" && (
        <footer className="bg-brand-navy text-zinc-400 text-xs py-8 px-6 mt-16 border-t border-zinc-800">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-6">
            <div>
              <h4 className="font-bold text-sm text-white">KopeRT © 2026</h4>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">Website E-Commerce Koperasi RT 04 / RW 02. Hak Cipta Dilindungi.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 text-[11px] text-zinc-500">
              <div>
                <span className="font-bold text-zinc-300 block mb-1">Hubungi Kami</span>
                <p className="mb-1">📧 <a href="mailto:koperasi.rt04@gmail.com" className="hover:text-white transition">koperasi.rt04@gmail.com</a></p>
                <p className="mb-0">📞 <a href="tel:081234567890" className="hover:text-white transition">0812-3456-7890</a></p>
              </div>
              <div>
                <span className="font-bold text-zinc-300 block mb-1">Alamat Koperasi</span>
                <p className="mb-1">📍 Sekretariat RT 04 / RW 02</p>
                <p className="mb-0">Gedung Serbaguna RT 04, Lantai 1</p>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
