import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import useSound from 'use-sound' 
import suaraSetor from './assets/setor.mp3'
import suaraTruk from './assets/truk.mp3' 
import { supabase } from './lib/supabaseClient' 

// --- DATA LUCU-LUCUAN ---
const quotes = [
  "Rakit terus sampe mampus! 💸",
  "Kardus dirakit, cuan selangit! 🚀",
  "Jangan biarkan doi menunggu, dia juga punya perasaan. 🚛",
  "Satu colly sejuta cerita, dua colly naik kasta! ✨",
  "Lelah boleh, menyerah jangan. Inget cicilan! 😜",
  "Merakit dus adalah jalan ninja kita. 🥷"
];

function App() {
  // --- STATE UTAMA ---
  const [view, setView] = useState("banking");
  const [stokTotal, setStokTotal] = useState(0);
  const [stokKeluar, setStokKeluar] = useState(0);
  const [nasabah, setNasabah] = useState([]); 
  const [logistikList, setLogistikList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [randomQuote] = useState(quotes[Math.floor(Math.random() * quotes.length)]);

  // --- STATE INPUT ---
  const [inputNama, setInputNama] = useState("");
  const [inputColly, setInputColly] = useState("");
  const [inputShift, setInputShift] = useState("1");
  const [supir, setSupir] = useState("");
  const [jumlahKeluar, setJumlahKeluar] = useState("");
  const [shiftSupir, setShiftSupir] = useState("1");

  const controls = useAnimation();
  const [playSetor] = useSound(suaraSetor, { volume: 0.5 });
  const [playTruk] = useSound(suaraTruk, { volume: 0.7 });

  const fetchData = async () => {
    setLoading(true);
    const { data: nData } = await supabase.from('nasabah').select(`id, nama, transaksi_gudang (rakit_gross, deposito_nett)`);
    const { data: lData } = await supabase.from('logistik_keluar').select('*').order('created_at', { ascending: false });

    if (nData) {
      const formatted = nData.map(n => ({
        id: n.id,
        nama: n.nama,
        rakitTotal: n.transaksi_gudang.reduce((sum, t) => sum + t.rakit_gross, 0),
        deposito: n.transaksi_gudang.reduce((sum, t) => sum + t.deposito_nett, 0)
      }));
      setNasabah(formatted);
      setStokTotal(formatted.reduce((sum, n) => sum + n.deposito, 0));
    }
    if (lData) {
      setLogistikList(lData);
      setStokKeluar(lData.reduce((sum, l) => sum + l.jumlah_keluar, 0));
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const tambahSetoran = async (e) => {
    e.preventDefault();
    const namaClean = inputNama.trim();
    const collyNum = parseInt(inputColly);
    
    if (!namaClean || !inputColly) {
      controls.start({ x: [0, -10, 10, -10, 10, 0], transition: { duration: 0.4 } });
      return;
    }

    if (collyNum > 5 && !window.confirm(`⚠️ Input ${collyNum} Colly?`)) return;

    try {
      let { data: user } = await supabase.from('nasabah').select('id').ilike('nama', namaClean).maybeSingle();
      let userId = user?.id;

      if (!userId) {
        const namaRapi = namaClean.charAt(0).toUpperCase() + namaClean.slice(1).toLowerCase();
        const { data: newUser } = await supabase.from('nasabah').insert([{ nama: namaRapi }]).select().single();
        userId = newUser.id;
      }

      await supabase.from('transaksi_gudang').insert([{
        nasabah_id: userId, shift: inputShift, colly: collyNum,
        rakit_gross: collyNum * 200, deposito_nett: (collyNum * 200) - (inputShift === "Middle" ? 400 : 200)
      }]);

      playSetor();
      setInputNama(""); setInputColly("");
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const tambahLogistik = async (e) => {
    e.preventDefault();
    if (!supir || !jumlahKeluar) return alert("Isi nama supir & jumlah kantong!");
    const totalDusKeluar = parseInt(jumlahKeluar) * 30;

    try {
      const { error } = await supabase.from('logistik_keluar').insert([{
        nama_supir: supir, shift: shiftSupir, jumlah_keluar: totalDusKeluar, keterangan: `${jumlahKeluar} Kantong`
      }]);
      if (error) throw error;
      
      playTruk(); 
      setSupir(""); setJumlahKeluar("");
      fetchData();
      alert(`🚛 TELOLET!! ${jumlahKeluar} Kantong Meluncur!`);
    } catch (err) { alert(err.message); }
  };

  // --- LOGIKA KIAMAT STOK ---
  const sisaStokFisik = stokTotal - stokKeluar;
  const sisaHari = Math.floor(sisaStokFisik / 810);

  return (
    <div style={styles.container}>
      <motion.div 
        animate={{ y: [0, -5, 0] }} 
        transition={{ repeat: Infinity, duration: 3 }}
        style={styles.quoteBox}
      >
        "{randomQuote}"
      </motion.div>

      <div style={styles.tabContainer}>
        <div onClick={() => setView("banking")} style={{...styles.tab, backgroundColor: view === "banking" ? "#8B4513" : "transparent", color: view === "banking" ? "white" : "#8B4513"}}>💰 BANKING</div>
        <div onClick={() => setView("logistics")} style={{...styles.tab, backgroundColor: view === "logistics" ? "#2E7D32" : "transparent", color: view === "logistics" ? "white" : "#2E7D32"}}>🚛 LOGISTIK</div>
      </div>

      <AnimatePresence mode="wait">
        {view === "banking" ? (
          <motion.div key="bank" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} style={styles.fullWidth}>
            <h1 style={styles.title}>📦 BANK DUS</h1>
            <div style={styles.cardStok}>
              <h2 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>TOTAL DEPOSITO NASABAH</h2>
              <div style={styles.numberStok}>{loading ? "..." : stokTotal}</div>
            </div>

            <div style={styles.formContainer}>
              <form onSubmit={tambahSetoran} style={styles.form}>
                <input style={styles.input} placeholder="Nama Penabung..." value={inputNama} onChange={(e) => setInputNama(e.target.value)} />
                <select style={styles.input} value={inputShift} onChange={(e) => setInputShift(e.target.value)}>
                  <option value="1">Shift 1</option><option value="2">Shift 2</option><option value="Middle">Middle</option>
                </select>
                <input style={styles.input} type="number" placeholder="Jumlah Colly..." value={inputColly} onChange={(e) => setInputColly(e.target.value)} />
                {inputColly && <div style={styles.liveHint}>= {parseInt(inputColly) * 200} Dus</div>}
                <motion.button animate={controls} style={styles.buttonSubmit}>SETOR SEKARANG 🚀</motion.button>
              </form>
            </div>

            <div style={styles.leaderboardContainer}>
              <h3 style={{ textAlign: 'center', color: '#8B4513', marginBottom: '20px' }}>🏆 KASTA PERAKIT</h3>
              {nasabah
                .filter(orang => !orang.nama.includes("SISTEM")) 
                .sort((a, b) => b.rakitTotal - a.rakitTotal)
                .map((orang, index) => {
                  let medali = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "👤";
                  const d = Number(orang.rakitTotal) || 0; 
                  let gelarTeks = "🌱 CALON JURAGAN";
                  let warnaGelar = "#8B4513";

                  if (d >= 3000) { gelarTeks = "👑 KELAZZ KING"; warnaGelar = "#FF8C00"; } 
                  else if (d >= 2000) { gelarTeks = "⚔️ PANGLIMA RAKIT"; warnaGelar = "#E64A19"; } 
                  else if (d >= 1000) { gelarTeks = "💪 PEJUANG KARDUS"; warnaGelar = "#2E7D32"; }

                  return (
                    <motion.div 
                      key={orang.id} 
                      whileHover={{ scale: 1.02 }}
                      style={{
                        ...styles.labelNasabah, 
                        borderColor: index === 0 ? "#FFD700" : "#D2B48C",
                        backgroundColor: index === 0 ? "#FFFDE7" : "white",
                        borderWidth: index < 3 ? '3px' : '2px',
                        marginBottom: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '1.5rem' }}>{medali}</span>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 'bold', color: '#5D4037', fontSize: '1.1rem' }}>{orang.nama}</div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', color: '#A0522D', fontWeight: 'bold' }}>🔥 {orang.rakitTotal} Dus</span>
                            <span style={{ fontSize: '0.65rem', color: warnaGelar, fontWeight: '900', marginTop: '2px' }}>{gelarTeks}</span>
                          </div>
                        </div>
                      </div>
                      <div style={styles.badgeDeposito}>
                        <div style={{fontSize: '0.5rem', opacity: 0.8}}>TABUNGAN</div>
                        {orang.deposito}
                      </div>
                    </motion.div>
                  );
                })
              }
            </div>
          </motion.div>
        ) : (
          <motion.div key="log" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} style={styles.fullWidth}>
            <h1 style={{...styles.title, color: '#2E7D32'}}>🚛 LOGISTIK DUS</h1>
            <div style={{...styles.cardStok, backgroundColor: '#4CAF50', borderColor: '#2E7D32', position: 'relative'}}>
              <h2 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>STOK FISIK REAL</h2>
              <div style={styles.numberStok}>{loading ? "..." : sisaStokFisik}</div>
              
              {/* --- ALAT PENGHITUNG MUNDUR KIAMAT STOK --- */}
              {/* --- ALAT PENGHITUNG MUNDUR KIAMAT STOK --- */}
{!loading && (() => {
  const sisaHari = Math.floor(sisaStokFisik / 810);
  let statusKiamat = "✅ STOK AMAN";
  let warnaKiamat = "#FFFFFF";
  let efekGlow = "none";
  let backgroundKiamat = "rgba(0,0,0,0.15)";

  if (sisaHari <= 0) {
    statusKiamat = "💀 KIAMAT SUDAH TIBA!";
    warnaKiamat = "#FFFFFF";
    backgroundKiamat = "#FF0000"; // Background merah full
    efekGlow = "0 0 20px #FF0000";
  } else if (sisaHari <= 2) {
    statusKiamat = "🆘 SEGERA KIAMAT!";
    warnaKiamat = "#FF5252";
    efekGlow = "0 0 10px rgba(255,82,82,0.8)";
  } else if (sisaHari <= 5) {
    statusKiamat = "⚠️ STOK MULAI TIPIS";
    warnaKiamat = "#FFD700"; // Kuning emas
  }

  return (
    <motion.div 
      animate={sisaHari <= 2 ? { scale: [1, 1.05, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1 }}
      style={{
        marginTop: '15px',
        padding: '12px',
        backgroundColor: backgroundKiamat,
        borderRadius: '15px',
        border: '1px dashed white',
        transition: 'all 0.5s ease'
      }}
    >
      <div style={{fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '1px'}}>🕒 STATUS KIAMAT DUS</div>
      <div style={{
        fontSize: '1.4rem', 
        fontWeight: '900', 
        color: warnaKiamat,
        textShadow: efekGlow
      }}>
        {sisaHari <= 0 ? statusKiamat : `${sisaHari} HARI LAGI`}
      </div>
      <div style={{fontSize: '0.8rem', fontWeight: 'bold', color: warnaKiamat, marginTop: '2px'}}>
        {sisaHari > 0 && statusKiamat}
      </div>
      <div style={{fontSize: '0.6rem', opacity: 0.8, marginTop: '5px'}}>(Asumsi 27 Kantong/Hari)</div>
    </motion.div>
  );
})()}
              
              <p style={{fontSize: '0.8rem', marginTop: 10}}>Masuk: {stokTotal} | Keluar: {stokKeluar}</p>
            </div>

            <div style={{...styles.formContainer, border: '3px dashed #2E7D32'}}>
              <form onSubmit={tambahLogistik} style={styles.form}>
                <input style={styles.input} placeholder="Nama Supir / No Polisi..." value={supir} onChange={(e) => setSupir(e.target.value)} />
                <select style={styles.input} value={shiftSupir} onChange={(e) => setShiftSupir(e.target.value)}>
                  <option value="1">Shift 1</option><option value="2">Shift 2</option>
                </select>
                <div style={{ position: 'relative' }}>
                  <input style={{...styles.input, width: '100%', boxSizing: 'border-box'}} type="number" placeholder="Berapa kantong yang dikirim?" value={jumlahKeluar} onChange={(e) => setJumlahKeluar(e.target.value)} />
                  {jumlahKeluar && <div style={{...styles.liveHint, color: '#2E7D32'}}>= {parseInt(jumlahKeluar) * 30} Dus</div>}
                </div>
                <button type="submit" style={{...styles.buttonSubmit, backgroundColor: '#2E7D32'}}>CATAT PENGIRIMAN 🚚</button>
              </form>
            </div>

            <div style={styles.leaderboardContainer}>
              <h3 style={{textAlign: 'center', color: '#2E7D32'}}>📜 RIWAYAT PENGIRIMAN</h3>
              {logistikList.map((log) => (
                <div key={log.id} style={{...styles.labelNasabah, borderColor: '#A5D6A7'}}>
                  <div style={{textAlign: 'left'}}>
                    <div style={{fontWeight: 'bold'}}>{log.nama_supir} (Shift {log.shift})</div>
                    <div style={{fontSize: '0.7rem', color: 'gray'}}>{new Date(log.created_at).toLocaleString('id-ID')}</div>
                  </div>
                  <div style={{...styles.badgeDeposito, backgroundColor: '#C62828'}}>-{log.jumlah_keluar}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#FFF8DC', fontFamily: 'sans-serif' },
  quoteBox: { backgroundColor: '#FFF9C4', padding: '10px 20px', borderRadius: '50px', border: '2px solid #FBC02D', color: '#827717', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '15px', textAlign: 'center' },
  tabContainer: { display: 'flex', gap: '10px', marginBottom: '20px', backgroundColor: '#EFEBE9', padding: '5px', borderRadius: '15px' },
  tab: { padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' },
  fullWidth: { width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  title: { fontSize: '2rem', color: '#8B4513', marginBottom: '20px' },
  cardStok: { backgroundColor: '#DEB887', padding: '20px', borderRadius: '25px', color: 'white', width: '100%', border: '4px solid #8B4513', textAlign: 'center', boxSizing: 'border-box' },
  numberStok: { fontSize: '3.5rem', fontWeight: '900' },
  formContainer: { backgroundColor: '#FAEBD7', padding: '20px', borderRadius: '20px', marginTop: '20px', width: '100%', border: '3px dashed #8B4513', boxSizing: 'border-box' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '12px', borderRadius: '10px', border: '2px solid #D2B48C', fontSize: '1rem', width: '100%', boxSizing: 'border-box' },
  liveHint: { fontSize: '0.8rem', color: '#8B4513', fontWeight: 'bold', marginTop: '5px' },
  buttonSubmit: { padding: '15px', backgroundColor: '#8B4513', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  leaderboardContainer: { width: '100%', marginTop: '30px' },
  labelNasabah: { padding: '12px', marginBottom: '8px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', border: '2px solid' },
  badgeDeposito: { backgroundColor: '#6B8E23', color: 'white', padding: '5px 12px', borderRadius: '8px', fontWeight: 'bold', minWidth: '60px', textAlign: 'center' }
}

export default App
