import { useState, useEffect } from 'react'
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

function App() {
  // --- STATE UTAMA ---
  const [view, setView] = useState("banking");
  const [stokTotal, setStokTotal] = useState(0); // Untuk Logistik (Termasuk SISTEM)
  const [stokManusia, setStokManusia] = useState(0); // Murni Tabungan Nasabah
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

      // Pisahkan stok murni manusia dan total (termasuk akun SISTEM)
      const totalMurni = formatted
        .filter(n => n.nama !== "SISTEM")
        .reduce((sum, n) => sum + n.deposito, 0);
      
      const totalSemua = formatted.reduce((sum, n) => sum + n.deposito, 0);

      setNasabah(formatted);
      setStokManusia(totalMurni); 
      setStokTotal(totalSemua); 
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
    const namaRaw = inputNama.trim();
    const collyNum = parseInt(inputColly);
    
    if (!namaRaw || !inputColly) {
      controls.start({ x: [0, -10, 10, -10, 10, 0], transition: { duration: 0.4 } });
      return;
    }

    if (collyNum > 5 && !window.confirm(`⚠️ Input ${collyNum} Colly?`)) return;

    try {
      const namaClean = namaRaw.charAt(0).toUpperCase() + namaRaw.slice(1).toLowerCase();
      let { data: user } = await supabase.from('nasabah').select('id').ilike('nama', namaClean).maybeSingle();
      let userId = user?.id;

      if (!userId) {
        const { data: newUser } = await supabase.from('nasabah').insert([{ nama: namaClean }]).select().single();
        userId = newUser.id;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: checkSetoran, error: checkError } = await supabase
        .from('transaksi_gudang')
        .select('id')
        .eq('nasabah_id', userId)
        .gte('tanggal', today.toISOString())
        .lt('tanggal', tomorrow.toISOString());

      if (checkError) throw checkError;
      const isFirstSetoranToday = (checkSetoran || []).length === 0;

      const gross = collyNum * 200;
      let potongan = 0;
      if (isFirstSetoranToday) {
        potongan = (inputShift === "Middle" ? 400 : 200);
      }
      const nett = gross - potongan;

      const { error } = await supabase.from('transaksi_gudang').insert([{
        nasabah_id: userId, 
        shift: inputShift, 
        colly: collyNum,
        rakit_gross: gross, 
        deposito_nett: nett
      }]);

      if (error) throw error;
      playSetor();
      alert(isFirstSetoranToday ? "✅ Setoran Pertama Berhasil!" : "✅ Setoran Tambahan Berhasil!");
      
      setInputNama(""); setInputColly("");
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const tambahLogistik = async (e) => {
    e.preventDefault();
    const supirRaw = supir.trim();
    if (!supirRaw || !jumlahKeluar) return alert("Isi nama supir & jumlah kantong!");
    
    // Cleaning Nama Supir
    const supirClean = supirRaw.charAt(0).toUpperCase() + supirRaw.slice(1).toLowerCase();
    const totalDusKeluar = parseInt(jumlahKeluar) * 30;

    try {
      const { error } = await supabase.from('logistik_keluar').insert([{
        nama_supir: supirClean,
        shift: shiftSupir, 
        jumlah_keluar: totalDusKeluar, 
        keterangan: `${jumlahKeluar} Kantong`
      }]);
      if (error) throw error;
      
      playTruk(); 
      setSupir(""); setInputColly(""); setJumlahKeluar("");
      fetchData();
      alert(`🚛 TELOLET!! ${jumlahKeluar} Kantong Meluncur!`);
    } catch (err) { alert(err.message); }
  };

  const sisaStokFisik = stokTotal - stokKeluar;

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
            <div style={styles.cardStok}>
              <h2 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>TOTAL DEPOSITO NASABAH</h2>
              <div style={styles.numberStok}>{loading ? "..." : stokManusia}</div>
            </div>

            <div style={styles.formContainer}>
              <form onSubmit={tambahSetoran} style={styles.form}>
                <input style={styles.input} placeholder="Nama Penabung..." value={inputNama} onChange={(e) => setInputNama(e.target.value)} />
                <select style={styles.input} value={inputShift} onChange={(e) => setInputShift(e.target.value)}>
                  <option value="1">Shift 1</option><option value="2">Shift 2</option><option value="Middle">Middle</option>
                </select>
                <input style={styles.input} type="number" placeholder="Jumlah Colly..." value={inputColly} onChange={(e) => setInputColly(e.target.value)} />
                <motion.button animate={controls} style={styles.buttonSubmit}>SETOR SEKARANG 🚀</motion.button>
              </form>
            </div>

            <div style={styles.leaderboardContainer}>
              <h3 style={{ textAlign: 'center', color: '#8B4513', marginBottom: '20px' }}>🏆 KASTA PERAKIT</h3>
              {nasabah
                .filter(orang => orang.nama !== "SISTEM") 
                .sort((a, b) => b.rakitTotal - a.rakitTotal)
                .map((orang, index) => (
                  <motion.div key={orang.id} whileHover={{ scale: 1.02 }} style={{...styles.labelNasabah, borderColor: index === 0 ? "#FFD700" : "#D2B48C", backgroundColor: index === 0 ? "#FFFDE7" : "white"}}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ fontSize: '1.5rem' }}>{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "👤"}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 'bold', color: '#5D4037' }}>{orang.nama}</div>
                        <span style={{ fontSize: '0.8rem', color: '#A0522D' }}>🔥 {orang.rakitTotal} Dus</span>
                      </div>
                    </div>
                    <div style={styles.badgeDeposito}>{orang.deposito}</div>
                  </motion.div>
                ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="log" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} style={styles.fullWidth}>
            <h1 style={{...styles.title, color: '#2E7D32'}}>🚛 LOGISTIK DUS</h1>
            <div style={{...styles.cardStok, backgroundColor: '#4CAF50', borderColor: '#2E7D32'}}>
              <h2 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>STOK FISIK REAL</h2>
              <div style={styles.numberStok}>{loading ? "..." : sisaStokFisik}</div>
              
              {!loading && (() => {
                const sisaHari = Math.floor(sisaStokFisik / 810);
                return (
                  <div style={{marginTop: '15px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '15px', border: '1px dashed white'}}>
                    <div style={{fontSize: '0.7rem', fontWeight: 'bold'}}>🕒 ESTIMASI STOK</div>
                    <div style={{fontSize: '1.4rem', fontWeight: '900'}}>{sisaHari <= 0 ? "KIAMAT!" : `${sisaHari} HARI LAGI`}</div>
                  </div>
                );
              })()}
            </div>

            <div style={{...styles.formContainer, border: '3px dashed #2E7D32'}}>
              <form onSubmit={tambahLogistik} style={styles.form}>
                <input style={styles.input} placeholder="Nama Supir..." value={supir} onChange={(e) => setSupir(e.target.value)} />
                <input style={styles.input} type="number" placeholder="Jumlah Kantong..." value={jumlahKeluar} onChange={(e) => setJumlahKeluar(e.target.value)} />
                <button type="submit" style={{...styles.buttonSubmit, backgroundColor: '#2E7D32'}}>CATAT PENGIRIMAN 🚚</button>
              </form>
            </div>

            <div style={styles.leaderboardContainer}>
              <h3 style={{textAlign: 'center', color: '#2E7D32'}}>📜 RIWAYAT PENGIRIMAN</h3>
              {logistikList.map((log) => (
                <div key={log.id} style={{...styles.labelNasabah, borderColor: '#A5D6A7'}}>
                  <div style={{textAlign: 'left'}}>
                    <div style={{fontWeight: 'bold'}}>{log.nama_supir}</div>
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
  buttonSubmit: { padding: '15px', backgroundColor: '#8B4513', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  leaderboardContainer: { width: '100%', marginTop: '30px' },
  labelNasabah: { padding: '12px', marginBottom: '8px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', border: '2px solid' },
  badgeDeposito: { backgroundColor: '#6B8E23', color: 'white', padding: '5px 12px', borderRadius: '8px', fontWeight: 'bold', minWidth: '60px', textAlign: 'center' }
}

export default App