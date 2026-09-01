import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { 
  collection, addDoc, onSnapshot, updateDoc, doc, query, orderBy 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState('pesan'); // 'pesan', 'titip', 'admin'

  // Form State Pemesanan
  const [role, setRole] = useState('siswa'); // 'siswa' | 'guru'
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [metodeBayar, setMetodeBayar] = useState('cash'); // 'cash', 'dana', 'qris'
  const [buktiFile, setBuktiFile] = useState(''); // Menyimpan data file gambar dalam base64

  // Items State (Keranjang Pesanan)
  const [bobaQty, setBobaQty] = useState(0);
  const [seblakQty, setSeblakQty] = useState(0);
  const [seblakLevel, setSeblakLevel] = useState('Original');
  const [esKepalQty, setEsKepalQty] = useState(0);
  const [esKepalTopping, setEsKepalTopping] = useState([]);

  // Form State Titip Jualan
  const [titipNama, setTitipNama] = useState('');
  const [titipKontak, setTitipKontak] = useState('');
  const [titipProduk, setTitipProduk] = useState('');
  const [titipHarga, setTitipHarga] = useState('');

  // Admin State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [userAdmin, setUserAdmin] = useState(null);
  const [pesananList, setPesananList] = useState([]);
  const [titipList, setTitipList] = useState([]);

  // Cek Auth Admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserAdmin(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Data Realtime untuk Admin
  useEffect(() => {
    if (userAdmin) {
      const qPesanan = query(collection(db, 'pesanan'), orderBy('waktu', 'desc'));
      const unsubPesanan = onSnapshot(qPesanan, (snapshot) => {
        setPesananList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const qTitip = query(collection(db, 'titip_jualan'), orderBy('waktu', 'desc'));
      const unsubTitip = onSnapshot(qTitip, (snapshot) => {
        setTitipList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => {
        unsubPesanan();
        unsubTitip();
      };
    }
  }, [userAdmin]);

  // Hitung Total Harga Pemesanan
  const totalHarga = (bobaQty * 7000) + (seblakQty * 5000) + (esKepalQty * 5000);

  // Toggle Topping Es Kepal
  const handleToppingChange = (topping) => {
    if (esKepalTopping.includes(topping)) {
      setEsKepalTopping(esKepalTopping.filter(t => t !== topping));
    } else {
      setEsKepalTopping([...esKepalTopping, topping]);
    }
  };

  // Fungsi Convert File Gambar ke Base64
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBuktiFile(reader.result); // Menyimpan hasil konversi file ke state
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Pesanan Pelanggan
  const handleSubmitPesanan = async (e) => {
    e.preventDefault();
    if (totalHarga === 0) {
      alert("Pilih minimal 1 menu pesanan!");
      return;
    }
    if (!nama) {
      alert("Masukkan nama pemesan!");
      return;
    }
    if (metodeBayar !== 'cash' && !buktiFile) {
      alert("Harap unggah bukti transfer pembayaran!");
      return;
    }

    const detailPesanan = [];
    if (bobaQty > 0) detailPesanan.push(`Boba Milk (${bobaQty}x)`);
    if (seblakQty > 0) detailPesanan.push(`Seblak Rafael lvl ${seblakLevel} (${seblakQty}x)`);
    if (esKepalQty > 0) detailPesanan.push(`Es Kepal Milo [Topping: ${esKepalTopping.length > 0 ? esKepalTopping.join(', ') : 'Tanpa Topping'}] (${esKepalQty}x)`);

    try {
      await addDoc(collection(db, 'pesanan'), {
        nama,
        role,
        kelas: role === 'guru' ? 'Guru' : kelas,
        detailPesanan,
        totalHarga,
        metodeBayar,
        buktiFile: metodeBayar !== 'cash' ? buktiFile : '-',
        status: 'Menunggu Konfirmasi',
        waktu: new Date()
      });
      alert("Pesanan berhasil dikirim! Silakan tunggu konfirmasi admin.");
      // Reset Form
      setNama('');
      setKelas('');
      setBobaQty(0);
      setSeblakQty(0);
      setEsKepalQty(0);
      setEsKepalTopping([]);
      setBuktiFile('');
    } catch (err) {
      alert("Gagal membuat pesanan: " + err.message);
    }
  };

  // Submit Form Titip Jualan
  const handleSubmitTitip = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'titip_jualan'), {
        namaPenitip: titipNama,
        kontak: titipKontak,
        namaProduk: titipProduk,
        hargaJual: Number(titipHarga),
        komisi: Number(titipHarga) * 0.005, // 0.5% komisi
        status: 'Menunggu Persetujuan',
        waktu: new Date()
      });
      alert("Pengajuan titip jualan berhasil dikirim! Tunggu persetujuan admin.");
      setTitipNama('');
      setTitipKontak('');
      setTitipProduk('');
      setTitipHarga('');
    } catch (err) {
      alert("Gagal mengirim pengajuan: " + err.message);
    }
  };

  // Auth Admin Login/Logout
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    } catch (err) {
      alert("Login Admin Gagal: " + err.message);
    }
  };

  const handleAdminLogout = () => {
    signOut(auth);
  };

  // Admin Actions
  const konfirmasiPesanan = async (id) => {
    await updateDoc(doc(db, 'pesanan', id), { status: 'Selesai / Lunas' });
  };

  const setujuiTitip = async (id) => {
    await updateDoc(doc(db, 'titip_jualan', id), { status: 'Disetujui' });
  };

  // Hitung Total Penghasilan Admin
  const totalPenghasilan = pesananList
    .filter(p => p.status === 'Selesai / Lunas')
    .reduce((acc, curr) => acc + curr.totalHarga, 0);

  return (
    <div className="min-h-screen bg-orange-50 font-sans pb-10">
      {/* Header / Navbar */}
      <header className="bg-orange-600 text-white p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-wide">🥤 Warung Dasafa</h1>
          <nav className="flex space-x-2">
            <button 
              onClick={() => setActiveTab('pesan')}
              className={`px-3 py-1 rounded-md text-sm font-semibold ${activeTab === 'pesan' ? 'bg-orange-800' : 'bg-orange-700 hover:bg-orange-800'}`}
            >
              Pesan Menu
            </button>
            <button 
              onClick={() => setActiveTab('titip')}
              className={`px-3 py-1 rounded-md text-sm font-semibold ${activeTab === 'titip' ? 'bg-orange-800' : 'bg-orange-700 hover:bg-orange-800'}`}
            >
              Titip Jualan
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1 rounded-md text-sm font-semibold ${activeTab === 'admin' ? 'bg-orange-800' : 'bg-orange-700 hover:bg-orange-800'}`}
            >
              Admin
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">

        {/* TAB 1: FORM PEMESANAN */}
        {activeTab === 'pesan' && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-orange-100">
            <h2 className="text-xl font-bold mb-4 text-orange-900 border-b pb-2">Form Pemesanan Pelanggan</h2>
            
            <form onSubmit={handleSubmitPesanan} className="space-y-6">
              {/* Identitas Pemesan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status Pemesan</label>
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="siswa">Siswa</option>
                    <option value="guru">Guru</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Nama Pemesan</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Masukkan nama"
                    value={nama} 
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {role === 'siswa' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Kelas</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Contoh: X PPLG 1"
                      value={kelas} 
                      onChange={(e) => setKelas(e.target.value)}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}
              </div>

              {/* Menu Selection */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-lg text-gray-800">Pilih Menu</h3>
                
                {/* 1. Boba Milk */}
                <div className="flex justify-between items-center p-3 border rounded-lg bg-orange-50/50">
                  <div>
                    <h4 className="font-bold">Boba Milk</h4>
                    <p className="text-sm text-gray-600">Rp 7.000</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button type="button" onClick={() => setBobaQty(Math.max(0, bobaQty - 1))} className="px-3 py-1 bg-gray-200 rounded-md">-</button>
                    <span className="font-bold w-6 text-center">{bobaQty}</span>
                    <button type="button" onClick={() => setBobaQty(bobaQty + 1)} className="px-3 py-1 bg-orange-500 text-white rounded-md">+</button>
                  </div>
                </div>

                {/* 2. Seblak Rafael */}
                <div className="p-3 border rounded-lg bg-orange-50/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold">Seblak Rafael</h4>
                      <p className="text-sm text-gray-600">Rp 5.000</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button type="button" onClick={() => setSeblakQty(Math.max(0, seblakQty - 1))} className="px-3 py-1 bg-gray-200 rounded-md">-</button>
                      <span className="font-bold w-6 text-center">{seblakQty}</span>
                      <button type="button" onClick={() => setSeblakQty(seblakQty + 1)} className="px-3 py-1 bg-orange-500 text-white rounded-md">+</button>
                    </div>
                  </div>
                  {seblakQty > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Pilih Level Pedas:</label>
                      <select 
                        value={seblakLevel} 
                        onChange={(e) => setSeblakLevel(e.target.value)}
                        className="w-full p-1.5 text-sm border rounded-md"
                      >
                        <option value="Original">Original</option>
                        <option value="B aja">B Aja</option>
                        <option value="Lumayan">Lumayan</option>
                        <option value="Extra Seuhah">Extra Seuhah 🔥</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* 3. Es Kepal Milo */}
                <div className="p-3 border rounded-lg bg-orange-50/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold">Es Kepal Milo</h4>
                      <p className="text-sm text-gray-600">Rp 5.000</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button type="button" onClick={() => setEsKepalQty(Math.max(0, esKepalQty - 1))} className="px-3 py-1 bg-gray-200 rounded-md">-</button>
                      <span className="font-bold w-6 text-center">{esKepalQty}</span>
                      <button type="button" onClick={() => setEsKepalQty(esKepalQty + 1)} className="px-3 py-1 bg-orange-500 text-white rounded-md">+</button>
                    </div>
                  </div>
                  {esKepalQty > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Pilih Topping (Bisa Mix):</label>
                      <div className="flex space-x-4 text-sm">
                        {['Keju', 'Oreo', 'Chocochip'].map((topping) => (
                          <label key={topping} className="flex items-center space-x-1">
                            <input 
                              type="checkbox" 
                              checked={esKepalTopping.includes(topping)}
                              onChange={() => handleToppingChange(topping)}
                              className="rounded text-orange-600"
                            />
                            <span>{topping}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Total & Metode Pembayaran */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between items-center bg-orange-100 p-3 rounded-lg">
                  <span className="font-bold text-lg">Total Pembayaran:</span>
                  <span className="font-bold text-xl text-orange-700">Rp {totalHarga.toLocaleString('id-ID')}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Metode Pembayaran</label>
                  <select 
                    value={metodeBayar} 
                    onChange={(e) => setMetodeBayar(e.target.value)}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="cash">Cash (Bayar Langsung di Kasir)</option>
                    <option value="dana">Transfer DANA (089665454143)</option>
                    <option value="qris">QRIS</option>
                  </select>
                </div>

                {/* Tampilan Khusus DANA */}
                {metodeBayar === 'dana' && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm space-y-3">
                    <div>
                      <p className="font-bold text-blue-900">Transfer ke Nomor DANA:</p>
                      <p className="text-lg font-extrabold text-blue-700">089665454143</p>
                    </div>
                    <div>
                      <label className="block font-medium text-sm mb-1">Upload Bukti Transfer (Foto/Screenshot):</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="w-full p-2 border rounded-md bg-white text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Tampilan Khusus QRIS */}
                {metodeBayar === 'qris' && (
                  <div className="bg-gray-50 p-4 rounded-lg border text-center space-y-3">
                    <p className="font-semibold text-gray-700">Scan QRIS di bawah ini untuk membayar:</p>
                    <img 
                      src="/qris.jpg" 
                      alt="QRIS Warung Dasafa" 
                      className="w-64 mx-auto rounded-lg shadow-md border"
                    />
                    <div className="text-left">
                      <label className="block font-medium text-sm mb-1">Upload Bukti QRIS (Foto/Screenshot):</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="w-full p-2 border rounded-md bg-white text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg shadow-md transition duration-200"
              >
                Kirim Pesanan
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: FORM TITIP JUALAN */}
        {activeTab === 'titip' && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-orange-100 max-w-lg mx-auto">
            <h2 className="text-xl font-bold mb-2 text-orange-900 border-b pb-2">Form Titip Jualan</h2>
            <p className="text-xs text-gray-500 mb-4">*Ketentuan: Biaya bagi hasil/komisi sebesar 0,5% dari setiap produk yang terjual.</p>
            
            <form onSubmit={handleSubmitTitip} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nama Pemilik/Penitip</label>
                <input 
                  type="text" 
                  required
                  placeholder="Nama lengkap"
                  value={titipNama}
                  onChange={(e) => setTitipNama(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nomor WhatsApp / Kontak</label>
                <input 
                  type="text" 
                  required
                  placeholder="08xxxxxxxxxx"
                  value={titipKontak}
                  onChange={(e) => setTitipKontak(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nama Produk Makanan/Minuman</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Keripik Kaca"
                  value={titipProduk}
                  onChange={(e) => setTitipProduk(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Harga Jual (Rp)</label>
                <input 
                  type="number" 
                  required
                  placeholder="5000"
                  value={titipHarga}
                  onChange={(e) => setTitipHarga(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
                {titipHarga > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Potongan Komisi Warung (0.5%): Rp {(titipHarga * 0.005).toFixed(0)}
                  </p>
                )}
              </div>

              <button 
                type="submit" 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded-lg"
              >
                Kirim Pengajuan Titip
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: HALAMAN ADMIN */}
        {activeTab === 'admin' && (
          <div>
            {!userAdmin ? (
              /* Admin Login Form */
              <div className="bg-white rounded-xl shadow-md p-6 border max-w-md mx-auto">
                <h2 className="text-xl font-bold mb-4 text-center text-orange-900">Login Admin Warung Dasafa</h2>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email Admin</label>
                    <input 
                      type="email" 
                      required
                      placeholder="admin@warungdasafa.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  <button type="submit" className="w-full bg-orange-600 text-white font-bold py-2 rounded-lg">
                    Masuk Admin
                  </button>
                </form>
              </div>
            ) : (
              /* Admin Dashboard */
              <div className="space-y-6">
                {/* Admin Header Stats */}
                <div className="bg-white p-6 rounded-xl shadow-md flex justify-between items-center border">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Dashboard Kasir & Admin</h2>
                    <p className="text-sm text-gray-500">Login sebagai: {userAdmin.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-semibold">TOTAL PENGHASILAN LUNAS</p>
                    <p className="text-2xl font-extrabold text-green-600">Rp {totalPenghasilan.toLocaleString('id-ID')}</p>
                    <button onClick={handleAdminLogout} className="text-xs text-red-600 underline mt-1">Logout</button>
                  </div>
                </div>

                {/* Daftar Pesanan Masuk */}
                <div className="bg-white p-6 rounded-xl shadow-md border">
                  <h3 className="font-bold text-lg mb-4 text-orange-900 border-b pb-2">Rekap Pesanan Masuk</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-orange-100 text-orange-900">
                        <tr>
                          <th className="p-2">Pemesan</th>
                          <th className="p-2">Role/Kelas</th>
                          <th className="p-2">Detail Pesanan</th>
                          <th className="p-2">Total</th>
                          <th className="p-2">Metode / Bukti File</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pesananList.length === 0 ? (
                          <tr><td colSpan="7" className="p-4 text-center text-gray-500">Belum ada pesanan.</td></tr>
                        ) : (
                          pesananList.map((p) => (
                            <tr key={p.id} className="border-b hover:bg-orange-50/30">
                              <td className="p-2 font-bold">{p.nama}</td>
                              <td className="p-2">{p.role === 'guru' ? 'Guru' : p.kelas}</td>
                              <td className="p-2">
                                <ul className="list-disc list-inside">
                                  {p.detailPesanan?.map((item, idx) => <li key={idx}>{item}</li>)}
                                </ul>
                              </td>
                              <td className="p-2 font-semibold">Rp {p.totalHarga?.toLocaleString('id-ID')}</td>
                              <td className="p-2">
                                <span className="uppercase font-semibold text-xs bg-gray-200 px-2 py-0.5 rounded">{p.metodeBayar}</span>
                                {p.buktiFile && p.buktiFile !== '-' ? (
                                  <div className="mt-1">
                                    <a 
                                      href={p.buktiFile} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 underline font-medium block"
                                    >
                                      🔍 Lihat Bukti Foto
                                    </a>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 mt-1">Tidak ada file</p>
                                )}
                              </td>
                              <td className="p-2">
                                <span className={`text-xs px-2 py-1 rounded font-bold ${p.status === 'Selesai / Lunas' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="p-2">
                                {p.status !== 'Selesai / Lunas' && (
                                  <button 
                                    onClick={() => konfirmasiPesanan(p.id)}
                                    className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700"
                                  >
                                    Konfirmasi Lunas
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Daftar Pengajuan Titip Jualan */}
                <div className="bg-white p-6 rounded-xl shadow-md border">
                  <h3 className="font-bold text-lg mb-4 text-orange-900 border-b pb-2">Permintaan Titip Jualan (Komisi 0.5%)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-orange-100 text-orange-900">
                        <tr>
                          <th className="p-2">Penitip</th>
                          <th className="p-2">Kontak</th>
                          <th className="p-2">Produk</th>
                          <th className="p-2">Harga Jual</th>
                          <th className="p-2">Komisi Warung (0.5%)</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {titipList.length === 0 ? (
                          <tr><td colSpan="7" className="p-4 text-center text-gray-500">Belum ada permintaan titip jualan.</td></tr>
                        ) : (
                          titipList.map((t) => (
                            <tr key={t.id} className="border-b hover:bg-orange-50/30">
                              <td className="p-2 font-bold">{t.namaPenitip}</td>
                              <td className="p-2">{t.kontak}</td>
                              <td className="p-2">{t.namaProduk}</td>
                              <td className="p-2 font-semibold">Rp {t.hargaJual?.toLocaleString('id-ID')}</td>
                              <td className="p-2 text-orange-600 font-semibold">Rp {t.komisi?.toFixed(0)}</td>
                              <td className="p-2">
                                <span className={`text-xs px-2 py-1 rounded font-bold ${t.status === 'Disetujui' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="p-2">
                                {t.status !== 'Disetujui' && (
                                  <button 
                                    onClick={() => setujuiTitip(t.id)}
                                    className="bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700"
                                  >
                                    Setujui
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}