import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import useSound from 'use-sound' 
import suaraSetor from './assets/setor.mp3'
import suaraTruk from './assets/truk.mp3' 
import { supabase } from './lib/supabaseClient' 

const quotes = [
  "Rakit terus sampe mampus! 💸",
  "Kardus dirakit, cuan selangit! 🚀",
  "Jangan biarkan doi menunggu, dia juga punya perasaan. 🚛",
  "Satu colly sejuta cerita, dua colly naik kasta! ✨",
  "Lelah boleh, menyerah jangan. Inget cicilan! 😜",
  "Merakit dus adalah jalan ninja kita. 🥷"
];

// --- KOMPONEN ANIMASI ANGKA (TIMBANGAN) ---
function Counter({ value }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = displayValue;
    const end = parseInt(value) || 0;
    if (start === end) return;

    let totalDuration = 800; 
    let frameDuration = 1000 / 60;
    let totalFrames = Math.round(totalDuration / frameDuration);
    let counter = 0;

    const timer = setInterval(() => {
      counter++;
      const progress = counter / totalFrames;
      const current = Math.round(start + (end - start) * (1 - Math.pow(1 - progress, 3)));
      setDisplayValue(current);
      if (counter === totalFrames) clearInterval(timer);
    }, frameDuration);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue.toLocaleString('id-ID')}</span>;
}

function App() {
  // --- STATE UTAMA ---
  const [view, setView] = useState("banking");
  const [stokTotal, setStokTotal] = useState(0); 
  const [stokManusia, setStokManusia] = useState(0); 
  const [stokBahanColly, setStokBahanColly] = useState(0); 
  const [stokKeluar, setStokKeluar] = useState(0);
  const [nasabah, setNasabah] = useState([]); 
  const [logistikList, setLogistikList] = useState([]);
  const [logHariIni, setLogHariIni] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [randomQuote] = useState(quotes[Math.floor(Math.random() * quotes.length)]);

  // --- STATE INPUT ---
  const [inputNama, setInputNama] = useState("");
  const [inputColly, setInputColly] = useState("");
  const [inputShift, setInputShift] = useState("1");
  const [supir, setSupir] = useState("");
  const [jumlahKeluar, setJumlahKeluar] = useState("");
  const [shiftSupir, setShiftSupir] = useState("1");
  const [inputBahan, setInputBahan] = useState(""); // State baru untuk input bahan masuk

  const controls = useAnimation();
  const [playSetor] = useSound(suaraSetor, { volume: 0.5 });
  const [playTruk] = useSound(suaraTruk, { volume: 0.7 });

  const dapatkanGelar = (total, tabungan) => {
    if (total >= 5000 && tabungan > 1000) return { teks: "PRESIDENT UNITED OF DUZZZ 🏛️", warna: "#1A237E" };
    if (total >= 5000) return { teks: "DEWA KARDUS SEMESTA 🌌", warna: "#4A148C" };
    if (total >= 4500) return { teks: "KAISAR DUS ABADI 👑", warna: "#B71C1C" };
    if (total >= 4000) return { teks: "SULTAN ELITE 💎", warna: "#0D47A1" };
    if (total >= 3500) return { teks: "LEGEND RAKIT 🏆", warna: "#E65100" };
    if (total >= 3000) return { teks: "C.E.O Duzzz 🏰", warna: "#004D40" };
    if (total >= 2500) return { teks: "JURAGAN KAYA 💸", warna: "#2E7D32" };
    if (total >= 2000) return { teks: "JAWARA PRO 🦾", warna: "#37474F" };
    if (total >= 1500) return { teks: "PENDEKAR DUS ⚔️", warna: "#5D4037" };
    if (total >= 1000) return { teks: "SPESIALIS RAKIT ✨", warna: "#00838F" };
    if (total >= 500)  return { teks: "PERAKIT AMBICIUS 🚀", warna: "#F9A825" };
    return { teks: "WARGA RAJIN 🌱", warna: "#8BC34A" };
  };

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [nRes, lRes, bRes, logRes] = await Promise.all([
        supabase.from('nasabah').select(`id, nama, transaksi_gudang (rakit_gross, deposito_nett, colly)`),
        supabase.from('logistik_keluar').select('*').order('created_at', { ascending: false }),
        supabase.from('stok_bahan').select('jumlah_masuk'),
        supabase.from('transaksi_gudang')
          .select('id, rakit_gross, deposito_nett, nasabah_id, tanggal')
          .gte('tanggal', twentyFourHoursAgo)
          .order('id', { ascending: false })
          .limit(4)
      ]);

      if (nRes.data) {
        const formatted = nRes.data.map(n => ({
          id: n.id,
          nama: n.nama,
          rakitTotal: n.transaksi_gudang.reduce((sum, t) => sum + (t.rakit_gross || 0), 0),
          deposito: n.transaksi_gudang.reduce((sum, t) => sum + (t.deposito_nett || 0), 0),
          collyTotal: n.transaksi_gudang.reduce((sum, t) => sum + (t.colly || 0), 0)
        }));

        setNasabah(formatted);
        setStokManusia(formatted.filter(n => n.nama !== "SISTEM").reduce((sum, n) => sum + n.deposito, 0)); 
        setStokTotal(formatted.reduce((sum, n) => sum + n.rakitTotal, 0)); 
        
        const totalCollyTerpakai = formatted.filter(n => n.nama !== "SISTEM").reduce((sum, n) => sum + n.collyTotal, 0);
        const totalBahanMasuk = bRes.data ? bRes.data.reduce((sum, b) => sum + b.jumlah_masuk, 0) : 0;
        setStokBahanColly(totalBahanMasuk - totalCollyTerpakai);

        if (logRes.data) {
          const processedLogs = logRes.data.map(log => {
            const dataNasabah = formatted.find(n => n.id === log.nasabah_id);
            return { ...log, nama_tampil: dataNasabah ? dataNasabah.nama : "Anonim" };
          });
          setLogHariIni(processedLogs);
        }
      }
      
      if (lRes.data) {
        setLogistikList(lRes.data);
        setStokKeluar(lRes.data.reduce((sum, l) => sum + l.jumlah_keluar, 0));
      }
    } catch (err) { console.error("Fetch error:", err); } 
    finally { setLoading(false); setIsInitialLoad(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tambahSetoran = async (e) => {
    e.preventDefault();
    const namaRaw = inputNama.trim();
    if (!namaRaw || inputColly === "") {
      controls.start({ x: [0, -10, 10, -10, 10, 0], transition: { duration: 0.4 } });
      return;
    }
    const collyNum = parseInt(inputColly);
    if (collyNum >= 50) return alert(`🚫 INPUT DITOLAK!\n\nIngat: 1 Colly = 200 Dus.`);

    try {
      const namaClean = namaRaw.charAt(0).toUpperCase() + namaRaw.slice(1).toLowerCase();
      let { data: user } = await supabase.from('nasabah').select('id').ilike('nama', namaClean).maybeSingle();
      let userId = user?.id;
      if (!userId) {
        const { data: newUser } = await supabase.from('nasabah').insert([{ nama: namaClean }]).select().single();
        userId = newUser.id;
      }
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const { data: checkSetoran } = await supabase.from('transaksi_gudang').select('id').eq('nasabah_id', userId).gte('tanggal', today.toISOString()).lt('tanggal', tomorrow.toISOString());

      const isFirstSetoranToday = (checkSetoran || []).length === 0;
      const gross = collyNum * 200;
      let potongan = isFirstSetoranToday ? (inputShift === "Middle" ? 400 : 200) : 0;
      const nett = gross - potongan;

      const { error } = await supabase.from('transaksi_gudang').insert([{ nasabah_id: userId, shift: inputShift, colly: collyNum, rakit_gross: gross, deposito_nett: nett }]);
      if (error) throw error;
      playSetor(); setInputNama(""); setInputColly(""); fetchData(true);
    } catch (err) { alert(err.message); }
  };

  const tambahLogistik = async (e) => {
    e.preventDefault();
    const supirRaw = supir.trim();
    if (!supirRaw || !jumlahKeluar) return alert("Isi nama supir & jumlah kantong!");
    const supirClean = supirRaw.charAt(0).toUpperCase() + supirRaw.slice(1).toLowerCase();
    const totalDusKeluar = parseInt(jumlahKeluar) * 30;
    try {
      const { error } = await supabase.from('logistik_keluar').insert([{ nama_supir: supirClean, shift: shiftSupir, jumlah_keluar: totalDusKeluar, keterangan: `${jumlahKeluar} Kantong` }]);
      if (error) throw error;
      playTruk(); setSupir(""); setJumlahKeluar(""); fetchData(true);
      alert(`🚛 TELOLET!! ${jumlahKeluar} Kantong Meluncur!`);
    } catch (err) { alert(err.message); }
  };

  const tambahBahan = async (e) => {
    e.preventDefault();
    if (!inputBahan || inputBahan <= 0) return alert("Isi jumlah Colly yang masuk!");
    
    try {
      setLoading(true);
      const { error } = await supabase.from('stok_bahan').insert([{ 
        jumlah_masuk: parseInt(inputBahan),
        keterangan: "Kiriman Baru" 
      }]);
      
      if (error) throw error;
      
      alert(`✅ MANTAP! ${inputBahan} Colly ditambahkan ke Gudang.`);
      setInputBahan("");
      fetchData(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIKA KIAMAT DUS ---
  const sisaStokFisik = stokTotal - stokKeluar;
  const sisaHari = Math.floor(sisaStokFisik / 810);
  const statusKiamat = sisaStokFisik < 500 ? "KRITIS" : sisaStokFisik < 1500 ? "WASPADA" : "AMAN";
  const warnaKiamat = statusKiamat === "KRITIS" ? "#FF5252" : statusKiamat === "WASPADA" ? "#FFAB40" : "#69F0AE";

  return (
    <div style={styles.container}>
      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 3 }} style={styles.quoteBox}>
        "{randomQuote}"
      </motion.div>

      <div style={styles.tabContainer}>
        <div onClick={() => setView("banking")} style={{...styles.tab, backgroundColor: view === "banking" ? "#8B4513" : "transparent", color: view === "banking" ? "white" : "#8B4513"}}>💰 BANKING</div>
        <div onClick={() => setView("logistics")} style={{...styles.tab, backgroundColor: view === "logistics" ? "#2E7D32" : "transparent", color: view === "logistics" ? "white" : "#2E7D32"}}>🚛 LOGISTIK</div>
      </div>

      <AnimatePresence mode="wait">
        {view === "banking" ? (
          <motion.div key="bank" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} style={styles.fullWidth}>
            <h1 style={styles.title}>📦 ISTANA KARDUS</h1>
            
            <div style={{...styles.cardStok, backgroundColor: '#FFF3E0', borderColor: '#FF9800', color: '#E65100', marginBottom: '15px'}}>
              <h2 style={{ margin: 0, fontSize: '0.7rem', opacity: 0.8 }}>SISA BAHAN (COLLY)</h2>
              <div style={{...styles.numberStok, fontSize: '2.5rem'}}>{isInitialLoad ? "..." : <Counter value={stokBahanColly} />}</div>
            </div>

            <div style={styles.cardStok}>
              <h2 style={{ margin: 0, fontSize: '0.7rem', opacity: 0.8 }}>TOTAL DEPOSITO NASABAH</h2>
              <div style={styles.numberStok}>{isInitialLoad ? "..." : <Counter value={stokManusia} />}</div>
            </div>

            <div style={styles.logContainer}>
              <div style={{fontSize: '0.65rem', fontWeight: 'bold', color: '#8B4513', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px'}}>
                <span style={{display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#4CAF50', borderRadius: '50%'}}></span>
                AKTIVITAS TERBARU
              </div>
              {logHariIni.length > 0 ? logHariIni.map((log) => (
                <div key={log.id} style={styles.logItem}>
                  <span style={{ flex: 1 }}>
                    <b>{log.nama_tampil}</b>: {log.rakit_gross || 0} Dus 
                    <span style={{ color: '#2E7D32', fontWeight: 'bold', marginLeft: '5px' }}>
                      (Tab: {log.deposito_nett || 0})
                    </span>
                  </span>
                  <span style={{fontSize: '0.55rem', opacity: 0.6, marginLeft: '10px'}}>
                    {log.tanggal ? new Date(log.tanggal).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                  </span>
                </div>
              )) : <div style={{fontSize: '0.7rem', fontStyle: 'italic', color: '#A0522D'}}>Belum ada setoran...</div>}
            </div>

            <div style={styles.formContainer}>
              <form onSubmit={tambahSetoran} style={styles.form}>
                <input style={styles.input} placeholder="Nama Penabung..." value={inputNama} onChange={(e) => setInputNama(e.target.value)} />
                <select style={styles.input} value={inputShift} onChange={(e) => setInputShift(e.target.value)}>
                  <option value="1">Shift 1</option><option value="2">Shift 2</option><option value="Middle">Middle</option>
                </select>
                <input style={styles.input} type="number" placeholder="Jumlah Colly..." value={inputColly} onChange={(e) => setInputColly(e.target.value)} />
                <motion.button animate={controls} style={styles.buttonSubmit} disabled={loading}>{loading ? "MEMPROSES..." : "SETOR SEKARANG 🚀"}</motion.button>
              </form>
            </div>

            <div style={styles.leaderboardContainer}>
              <h3 style={{ textAlign: 'center', color: '#8B4513' }}>🏆 KASTA PERAKIT</h3>
              {nasabah
                .filter(orang => orang.nama !== "SISTEM")
                .sort((a, b) => {
                  // 1. Cek dulu rakitan totalnya (siapa yang paling banyak rakit)
                  if (b.rakitTotal !== a.rakitTotal) {
                    return b.rakitTotal - a.rakitTotal;
                  }
                  // 2. Kalau rakitan sama (SERI), yang tabungannya lebih banyak yang menang
                  return b.deposito - a.deposito;
                })
                .map((orang, index) => {
                  const gelar = dapatkanGelar(orang.rakitTotal, orang.deposito);
                  return (
                    <div 
                      key={orang.id} 
                      style={{
                        ...styles.labelNasabah, 
                        borderColor: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : index === 2 ? "#CD7F32" : "#D2B48C"
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '1.5rem' }}>
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "👤"}
                        </span>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 'bold', color: '#5D4037' }}>{orang.nama}</div>
                          <div style={{ fontSize: '0.65rem', fontWeight: '900', color: gelar.warna }}>{gelar.teks}</div>
                          <span style={{ fontSize: '0.8rem', color: '#A0522D' }}>🔥 {orang.rakitTotal} Dus</span>
                        </div>
                      </div>
                      <div style={styles.badgeDeposito}>{orang.deposito}</div>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        ) : (
          <motion.div key="log" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} style={styles.fullWidth}>
            <h1 style={{...styles.title, color: '#2E7D32'}}>🚛 LOGISTIK DUS</h1>
            <div style={{...styles.cardStok, backgroundColor: '#4CAF50', borderColor: '#2E7D32'}}>
              <h2 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>STOK FISIK REAL</h2>
              <div style={styles.numberStok}>{isInitialLoad ? "..." : <Counter value={sisaStokFisik} />}</div>
              {!isInitialLoad && (
                <motion.div 
                  animate={statusKiamat === "KRITIS" ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1 }}
                  style={{marginTop: '15px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '15px', border: `2px dashed ${warnaKiamat}`}}
                >
                  <div style={{fontSize: '0.7rem', color: 'white'}}>🕒 STATUS: {statusKiamat}</div>
                  <div style={{fontSize: '1.2rem', fontWeight: '900', color: warnaKiamat}}>{sisaHari <= 0 ? "KIAMAT HARI INI!" : `${sisaHari} HARI LAGI`}</div>
                </motion.div>
              )}
            </div>

            <div style={{...styles.formContainer, border: '3px dashed #2E7D32'}}>
              <form onSubmit={tambahLogistik} style={styles.form}>
                <input style={styles.input} placeholder="Nama Supir..." value={supir} onChange={(e) => setSupir(e.target.value)} />
                <input style={styles.input} type="number" placeholder="Jumlah Kantong..." value={jumlahKeluar} onChange={(e) => setJumlahKeluar(e.target.value)} />
                <button type="submit" style={{...styles.buttonSubmit, backgroundColor: '#2E7D32'}} disabled={loading}>CATAT PENGIRIMAN 🚚</button>
              </form>
            </div>
            
            {/* FORM INPUT BAHAN MASUK (COLLY) */}
            <div style={{...styles.formContainer, border: '3px dashed #1976D2', backgroundColor: '#E3F2FD', marginBottom: '15px'}}>
              <h4 style={{margin: '0 0 10px 0', color: '#1976D2', fontSize: '0.8rem'}}>➕ TAMBAH BAHAN BAKU (COLLY)</h4>
              <form onSubmit={tambahBahan} style={styles.form}>
                <div style={{display: 'flex', gap: '10px'}}>
                  <input 
                    style={{...styles.input, flex: 2}} 
                    type="number" 
                    placeholder="Jumlah Colly Masuk..." 
                    value={inputBahan} 
                    onChange={(e) => setInputBahan(e.target.value)} 
                  />
                  <button type="submit" style={{...styles.buttonSubmit, backgroundColor: '#1976D2', flex: 1}} disabled={loading}>
                    {loading ? "..." : "TERIMA ✅"}
                  </button>
                </div>
              </form>
            </div>

            <div style={styles.leaderboardContainer}>
               {logistikList.map((log) => (
                <div key={log.id} style={{...styles.labelNasabah, borderColor: '#A5D6A7'}}>
                  <div style={{textAlign: 'left'}}><div style={{fontWeight: 'bold'}}>{log.nama_supir}</div><div style={{fontSize: '0.7rem'}}>{new Date(log.created_at).toLocaleString('id-ID')}</div></div>
                  <div style={{...styles.badgeDeposito, backgroundColor: '#C62828'}}>-{log.jumlah_keluar}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => fetchData()} style={styles.refreshBtn}>Refresh Data Manual</button>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#FFF8DC', fontFamily: 'sans-serif' },
  quoteBox: { backgroundColor: '#FFF9C4', padding: '10px 20px', borderRadius: '50px', border: '2px solid #FBC02D', color: '#827717', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '15px', textAlign: 'center' },
  tabContainer: { display: 'flex', gap: '10px', marginBottom: '20px', backgroundColor: '#EFEBE9', padding: '5px', borderRadius: '15px' },
  tab: { padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' },
  fullWidth: { width: '100%', maxWidth: '500px' },
  title: { fontSize: '2rem', color: '#8B4513', marginBottom: '10px', textAlign: 'center' },
  cardStok: { backgroundColor: '#DEB887', padding: '15px', borderRadius: '25px', color: 'white', border: '4px solid #8B4513', textAlign: 'center' },
  numberStok: { fontSize: '3.5rem', fontWeight: '900' },
  logContainer: { width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.4)', padding: '10px', borderRadius: '15px', border: '1px solid #D2B48C', marginTop: '15px', boxSizing: 'border-box', maxHeight: '150px',overflowY: 'auto' },
  logItem: { fontSize: '0.7rem', color: '#5D4037', display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dashed #D2B48C' },
  formContainer: { backgroundColor: '#FAEBD7', padding: '20px', borderRadius: '20px', marginTop: '15px', border: '3px dashed #8B4513' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '12px', borderRadius: '10px', border: '2px solid #D2B48C', fontSize: '1rem', width: '100%', boxSizing: 'border-box' },
  buttonSubmit: { padding: '15px', backgroundColor: '#8B4513', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  leaderboardContainer: { marginTop: '30px', width: '100%' },
  labelNasabah: { padding: '12px', marginBottom: '8px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', border: '2px solid' },
  badgeDeposito: { backgroundColor: '#6B8E23', color: 'white', padding: '5px 12px', borderRadius: '8px', fontWeight: 'bold' },
  refreshBtn: { marginTop: '20px', fontSize: '0.7rem', color: '#8B4513', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }
}

export default App