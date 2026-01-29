"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  updateDoc, deleteDoc, doc, serverTimestamp, getDocs
} from "firebase/firestore";
import { Trash2, Check, ChefHat, Wallet, Truck, Send, Save, Edit, X, FileText, ChevronDown, ChevronUp, ScanLine } from "lucide-react";
import Link from "next/link";
import { Html5QrcodeScanner } from "html5-qrcode";

type LangCode = "tr" | "de" | "pa";

// Tedarikçiler (Çok Dilli)
const SUPPLIERS: Record<string, { tr: string; de: string; pa: string }> = {
  metro: { tr: "Metro", de: "Metro", pa: "ਮੈਟਰੋ" },
  hal: { tr: "Hal (Sebze)", de: "Markt (Gemüse)", pa: "ਮੰਡੀ (ਸਬਜ਼ੀ)" },
  kasap: { tr: "Kasap", de: "Metzger", pa: "ਕਸਾਈ" },
  drink: { tr: "İçecekçi", de: "Getränkehändler", pa: "ਪੀਣ ਵਾਲੇ ਵਾਲਾ" },
  other: { tr: "Diğer", de: "Andere", pa: "ਹੋਰ" }
};

// Başlangıç için varsayılanlar (Veritabanı boşsa bunlar yüklenecek)
const DEFAULT_CATALOG = [
  { category: "veg", tr: "Domates", de: "Tomaten", pa: "ਟਮਾਟਰ", defaultPrice: 2.5, defaultSupplier: "hal" },
  { category: "veg", tr: "Soğan", de: "Zwiebeln", pa: "ਪਿਆਜ਼", defaultPrice: 1.2, defaultSupplier: "hal" },
  { category: "meat", tr: "Kıyma", de: "Hackfleisch", pa: "ਕੀਮਾ", defaultPrice: 12.0, defaultSupplier: "kasap" },
  { category: "metro", tr: "Yağ", de: "Öl", pa: "ਤੇਲ", defaultPrice: 25.0, defaultSupplier: "metro" },
];

const DICTIONARY = {
  tr: {
    title: "Pastillo Mutfak", placeholder: "Ürün adı...",
    unit_kg: "Kg", unit_pcs: "Adet", unit_box: "Kasa", unit_pack: "Paket",
    cat_metro: "Metro", cat_veg: "Sebze", cat_meat: "Kasap", cat_drink: "İçecek", cat_other: "Diğer",
    total_est: "Tahmini", save_catalog: "Kataloğa Kaydet", edit_mode: "Butonları Düzenle",
    reports: "Raporlar", completed: "Tamamlananlar", show: "Göster", hide: "Gizle",
    scan_barcode: "Barkod Tara", scanning: "Taranıyor...", scan_success: "Barkod bulundu!",
    no_items_category: "Bu kategoride kayıtlı buton yok.", quick_select: "Hızlı Seçim", done: "Bitti"
  },
  de: {
    title: "Pastillo Küche", placeholder: "Produktname...",
    unit_kg: "Kg", unit_pcs: "Stück", unit_box: "Kiste", unit_pack: "Packung",
    cat_metro: "Metro", cat_veg: "Gemüse", cat_meat: "Fleisch", cat_drink: "Getränke", cat_other: "Andere",
    total_est: "Summe", save_catalog: "In Katalog speichern", edit_mode: "Buttons bearbeiten",
    reports: "Berichte", completed: "Fertig", show: "Zeigen", hide: "Verstecken",
    scan_barcode: "Barcode scannen", scanning: "Scannt...", scan_success: "Barcode gefunden!",
    no_items_category: "Keine Buttons in dieser Kategorie.", quick_select: "Schnellauswahl", done: "Fertig"
  },
  pa: {
    title: "ਪਾਸਟਿਲੋ ਰਸੋਈ", placeholder: "ਉਤਪਾਦ ਦਾ ਨਾਮ...",
    unit_kg: "ਕਿਲੋ", unit_pcs: "ਟੁਕੜਾ", unit_box: "ਬਾਕਸ", unit_pack: "ਪੈਕਟ",
    cat_metro: "ਮੈਟਰੋ", cat_veg: "ਸਬਜ਼ੀ", cat_meat: "ਮੀਟ", cat_drink: "ਪੀਣ ਵਾਲੇ", cat_other: "ਹੋਰ",
    total_est: "ਕੁੱਲ", save_catalog: "ਕੈਟਾਲਾਗ ਵਿੱਚ ਸੁਰੱਖਿਅਤ ਕਰੋ", edit_mode: "ਬਟਨ ਸੰਪਾਦਿਤ ਕਰੋ",
    reports: "ਰਿਪੋਰਟਾਂ", completed: "ਪੂਰਾ ਹੋਇਆ", show: "ਦਿਖਾਓ", hide: "ਲੁਕਾਓ",
    scan_barcode: "ਬਾਰਕੋਡ ਸਕੈਨ ਕਰੋ", scanning: "ਸਕੈਨਿੰਗ...", scan_success: "ਬਾਰਕੋਡ ਮਿਲਿਆ!",
    no_items_category: "ਇਸ ਸ਼੍ਰੇਣੀ ਵਿੱਚ ਕੋਈ ਬਟਨ ਨਹੀਂ।", quick_select: "ਤੇਜ਼ ਚੋਣ", done: "ਹੋ ਗਿਆ"
  }
};

export default function Dashboard() {
  const [lang, setLang] = useState<LangCode>("tr");
  const t = DICTIONARY[lang];

  // Form State
  const [newItem, setNewItem] = useState("");
  const [category, setCategory] = useState("veg");
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState("kg");
  const [requester, setRequester] = useState("chef");
  const [price, setPrice] = useState("");
  const [supplier, setSupplier] = useState("metro");

  // ✨ YENİ: Kataloğa Kaydetme ve Düzenleme Modu
  const [saveToCatalog, setSaveToCatalog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showBought, setShowBought] = useState(false); // A2: Satın alınanları göster/gizle
  const [isScannerOpen, setIsScannerOpen] = useState(false); // B1: Barkod Tarayıcı

  const [preSelected, setPreSelected] = useState<any>(null);

  // Data State
  const [items, setItems] = useState<any[]>([]); // Alışveriş Listesi
  const [catalogItems, setCatalogItems] = useState<any[]>([]); // Butonlar

  // 1. Alışveriş Listesini Dinle
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  // 2. Kataloğu Dinle (Ve boşsa varsayılanları yükle)
  useEffect(() => {
    const q = query(collection(db, "catalog"), orderBy("tr", "asc"));
    return onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Eğer katalog boşsa varsayılanları yükle (Sadece ilk seferde çalışır)
        DEFAULT_CATALOG.forEach(async (item) => {
          await addDoc(collection(db, "catalog"), item);
        });
      } else {
        setCatalogItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    });
  }, []);

  const visibleItems = items.filter(item => !item.isArchived);

  // Toplam Tutar
  const totalCost = useMemo(() => visibleItems.reduce((acc, item) => acc + (Number(item.estimatedPrice) || 0), 0), [visibleItems]);

  // WhatsApp Gruplama
  const itemsBySupplier = useMemo(() => {
    const groups: Record<string, any[]> = {};
    visibleItems.filter(i => !i.isBought).forEach(item => {
      const sup = item.supplier || 'other';
      if (!groups[sup]) groups[sup] = [];
      groups[sup].push(item);
    });
    return groups;
  }, [visibleItems]);

  const sendToWhatsapp = (supplierId: string) => {
    const supplierName = SUPPLIERS[supplierId]?.[lang] || supplierId;
    const productList = itemsBySupplier[supplierId];
    if (!productList?.length) return;
    let message = `🛒 *Pastillo - ${supplierName}*\n\n`;
    productList.forEach(item => {
      const unitText = t[`unit_${item.unit}` as keyof typeof t] || item.unit;
      message += `- ${item.amount} ${unitText} ${item.names?.[lang] || item.originalName}\n`;
    });
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Katalogdan Seçim
  const selectFromCatalog = (item: any) => {
    if (isEditMode) return; // Düzenleme modundaysak seçme, bekle
    setNewItem(item[lang] || item.tr);
    setPreSelected(item);
    if (item.defaultPrice) setPrice(item.defaultPrice.toString());
    if (item.defaultSupplier) setSupplier(item.defaultSupplier);
    setSaveToCatalog(false); // Zaten katalogda var
  };

  // Katalogdan Silme
  const deleteFromCatalog = async (id: string) => {
    if (confirm("Bu butonu silmek istiyor musun?")) {
      await deleteDoc(doc(db, "catalog", id));
    }
  };

  // B1: Barkod Okuyucu
  useEffect(() => {
    if (!isScannerOpen) return;

    const scanner = new Html5QrcodeScanner(
      "barcode-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      async (decodedText) => {
        // Barkod okundu!
        console.log("Barkod:", decodedText);

        // Firebase'de bu barkodu ara
        const barcodeQuery = query(
          collection(db, "barcodes"),
          orderBy("barcode", "asc")
        );
        const snapshot = await getDocs(barcodeQuery);
        const barcodeData = snapshot.docs.find(doc => doc.data().barcode === decodedText);

        if (barcodeData) {
          // Barkod kayıtlı - Bilgileri doldur
          const data = barcodeData.data();
          setNewItem(data.productName || decodedText);
          if (data.price) setPrice(data.price.toString());
          if (data.supplier) setSupplier(data.supplier);
          if (data.category) setCategory(data.category);
        } else {
          // Yeni barkod - Sadece barkodu göster
          setNewItem(`Barkod: ${decodedText}`);
        }

        scanner.clear();
        setIsScannerOpen(false);
      },
      (error) => {
        // Hata mesajlarını görmezden gel (sürekli tarama yaparken normal)
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [isScannerOpen]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    const itemToAdd = newItem;
    // Eğer önceden seçilmediyse geçici isimler, seçildiyse katalog isimleri
    let names = preSelected ? preSelected : { tr: itemToAdd, de: itemToAdd, pa: itemToAdd };

    // Temizlenecek isimler (Kataloğa kaydederken 'names' yapısı farklı olmasın diye)
    // Sadece { tr, de, pa } kısmını alıyoruz, id veya diğerlerini değil.
    const cleanNames = {
      tr: names.tr || itemToAdd,
      de: names.de || itemToAdd,
      pa: names.pa || itemToAdd
    };

    const currentData = {
      lang, cat: category, amt: amount, unit: unit, req: requester, isPre: !!preSelected,
      price: parseFloat(price) || 0, sup: supplier, save: saveToCatalog
    };

    // Formu Temizle
    setNewItem(""); setPrice(""); setPreSelected(null); setSaveToCatalog(false);

    // 1. Alışveriş Listesine Ekle
    const docRef = await addDoc(collection(db, "products"), {
      originalName: itemToAdd,
      names: cleanNames,
      category: currentData.cat, amount: currentData.amt, unit: currentData.unit, requester: currentData.req,
      estimatedPrice: currentData.price, supplier: currentData.sup,
      isBought: false, isArchived: false, createdAt: serverTimestamp(), boughtAt: null,
      isTranslating: !currentData.isPre
    });

    // 2. Çeviri ve (Opsiyonel) Katalog Kaydı
    if (!currentData.isPre) {
      fetch('/api/translate', {
        method: 'POST', body: JSON.stringify({ productName: itemToAdd, inputLang: currentData.lang })
      })
        .then(res => res.json())
        .then(async (translatedNames) => {
          // Listeyi Güncelle
          await updateDoc(doc(db, "products", docRef.id), { names: translatedNames, isTranslating: false });

          // ✨ EĞER "KATALOĞA KAYDET" SEÇİLDİYSE ✨
          if (currentData.save) {
            await addDoc(collection(db, "catalog"), {
              category: currentData.cat,
              defaultPrice: currentData.price,
              defaultSupplier: currentData.sup,
              ...translatedNames // tr, de, pa buraya gelir
            });
          }
        });
    }
  };

  const toggleItem = async (id: string, stat: boolean) => updateDoc(doc(db, "products", id), { isBought: !stat, boughtAt: !stat ? serverTimestamp() : null });
  const archiveItem = async (id: string) => updateDoc(doc(db, "products", id), { isArchived: true });

  // Katalog filtreleme
  const currentCatalog = catalogItems.filter(i => i.category === category);

  return (
    <div className={`min-h-screen bg-gray-50 p-2 sm:p-4 ${lang === 'pa' ? 'font-gurmukhi' : ''}`}>
      <div className="max-w-xl mx-auto space-y-4">

        {/* ÜST BAR */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <ChefHat className="text-orange-600 w-6 h-6" />
              {t.title}
            </h1>
            <div className="flex items-center gap-2">
              {/* A1: Raporlar Butonu */}
              <Link href="/reports">
                <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors">
                  <FileText className="w-3 h-3" />
                  {t.reports}
                </button>
              </Link>
              {/* Dil Seçici */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(["tr", "de", "pa"] as LangCode[]).map((l) => (
                  <button key={l} onClick={() => setLang(l)} className={`px-2 py-1 rounded font-bold text-xs ${lang === l ? "bg-white text-orange-600 shadow" : "text-gray-400"}`}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <div className="bg-green-50 border border-green-100 px-3 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap">
              <Wallet className="w-4 h-4 text-green-700" />
              <span className="font-bold text-green-700">{totalCost.toFixed(0)} €</span>
            </div>
            {Object.keys(itemsBySupplier).map(supId => (
              <button key={supId} onClick={() => sendToWhatsapp(supId)}
                className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-xs font-bold shadow-sm whitespace-nowrap active:scale-95 transition-transform hover:bg-green-700">
                <Send className="w-3 h-3" />
                {SUPPLIERS[supId]?.[lang] || supId} ({itemsBySupplier[supId].length})
              </button>
            ))}
          </div>
        </div>

        {/* ANA FORM */}
        <div className="bg-white rounded-xl shadow-lg border-t-4 border-orange-500 overflow-hidden relative">

          {/* Kategori */}
          <div className="flex gap-2 overflow-x-auto p-3 bg-gray-50 border-b scrollbar-hide">
            {[{ id: "veg", icon: "🥦" }, { id: "meat", icon: "🥩" }, { id: "metro", icon: "🛒" }, { id: "drink", icon: "🥤" }]
              .map((cat) => (
                <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={`flex items-center gap-1 px-3 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${category === cat.id ? "bg-orange-600 text-white" : "bg-white text-gray-600 border"}`}>
                  <span>{cat.icon}</span> <span className="capitalize">{t[`cat_${cat.id}` as keyof typeof t]}</span>
                </button>
              ))}
          </div>

          {/* KATALOG (BUTONLAR) */}
          <div className="p-3 bg-blue-50/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">{t.quick_select}</span>
              <button onClick={() => setIsEditMode(!isEditMode)} className={`text-xs flex items-center gap-1 px-2 py-1 rounded border ${isEditMode ? 'bg-red-100 text-red-600 border-red-200' : 'bg-white text-gray-500 border-gray-200'}`}>
                {isEditMode ? t.done : <Edit className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentCatalog.map((item) => (
                <div key={item.id} className="relative group">
                  <button onClick={() => selectFromCatalog(item)}
                    className={`bg-white border text-gray-700 px-3 py-2 rounded-lg text-sm shadow-sm active:scale-95 transition-all
                                ${isEditMode ? 'border-red-200 opacity-80 cursor-default' : 'border-blue-100 hover:bg-blue-50'}`}>
                    {item[lang] || item.tr}
                  </button>
                  {/* Silme Butonu (Sadece Edit Modda Çıkar) */}
                  {isEditMode && (
                    <button onClick={() => deleteFromCatalog(item.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md z-10">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {currentCatalog.length === 0 && <span className="text-xs text-gray-400 italic">{t.no_items_category}</span>}
            </div>
          </div>

          <form onSubmit={addItem} className="p-4 space-y-3">
            {/* B1: Ürün Adı + Barkod Butonu */}
            <div className="flex gap-2">
              <input type="text" value={newItem} onChange={(e) => { setNewItem(e.target.value); setPreSelected(null); }}
                placeholder={t.placeholder} className="flex-1 p-3 bg-gray-50 border rounded-xl text-lg text-black" />
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors"
              >
                <ScanLine className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex gap-2">
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-16 p-2 bg-gray-50 border rounded-lg text-center font-bold text-black" />
                <select value={unit} onChange={(e) => setUnit(e.target.value)} className="flex-1 p-2 bg-gray-50 border rounded-lg text-black text-sm">
                  {['kg', 'pcs', 'box', 'pack'].map(u => <option key={u} value={u}>{t[`unit_${u}` as keyof typeof t]}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type="number" step="0.5" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-2 pl-6 bg-green-50 border border-green-200 rounded-lg text-green-800 font-bold placeholder-green-300" />
                  <span className="absolute left-2 top-2 text-green-600">€</span>
                </div>
                <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="flex-1 p-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs font-bold">
                  {Object.keys(SUPPLIERS).map(supId => <option key={supId} value={supId}>{SUPPLIERS[supId][lang]}</option>)}
                </select>
              </div>
            </div>

            {/* ✨ KATALOĞA KAYDET CHECKBOX ✨ */}
            {!preSelected && newItem.length > 0 && (
              <div className="flex items-center gap-2 bg-orange-50 p-2 rounded-lg border border-orange-100">
                <input
                  type="checkbox"
                  id="saveCatalog"
                  checked={saveToCatalog}
                  onChange={(e) => setSaveToCatalog(e.target.checked)}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                />
                <label htmlFor="saveCatalog" className="text-sm font-bold text-orange-700 flex items-center gap-1 cursor-pointer">
                  <Save className="w-4 h-4" />
                  {t.save_catalog}
                </label>
              </div>
            )}

            <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg shadow-md hover:bg-green-700 active:scale-95 transition-all">
              {t.title.split(' ')[0]} Ekle
            </button>
          </form>
        </div>

        {/* LİSTE */}
        <div className="space-y-4 pb-24">
          {/* ALINMAMIŞ ÜRÜNLER */}
          <div className="space-y-2">
            {visibleItems.filter(i => !i.isBought).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border bg-white shadow-sm border-l-4 border-l-orange-400">
                <div onClick={() => toggleItem(item.id, item.isBought)} className="flex items-center gap-3 flex-1 cursor-pointer">
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-gray-300">
                    {item.isBought && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">
                      {item.names?.[lang] || item.originalName}
                    </h3>
                    <div className="text-[11px] text-gray-500 flex flex-wrap gap-2 items-center mt-0.5">
                      <span className="font-bold text-gray-700">{item.amount} {t[`unit_${item.unit}` as keyof typeof t] || item.unit}</span>
                      <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                        <Truck className="w-3 h-3" />
                        {SUPPLIERS[item.supplier]?.[lang] || item.supplier}
                      </span>
                      {item.estimatedPrice > 0 && <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100 font-bold">{item.estimatedPrice} €</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => archiveItem(item.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>

          {/* A2: SATINALINMIŞ ÜRÜNLER (Toggle ile) */}
          {visibleItems.filter(i => i.isBought).length > 0 && (
            <div>
              <button
                onClick={() => setShowBought(!showBought)}
                className="flex items-center gap-2 text-sm font-bold text-gray-500 mb-2 hover:text-gray-700 transition-colors"
              >
                {showBought ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                ✓ {t.completed} ({visibleItems.filter(i => i.isBought).length})
              </button>

              {showBought && (
                <div className="space-y-2">
                  {visibleItems.filter(i => i.isBought).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border bg-gray-100 opacity-60">
                      <div onClick={() => toggleItem(item.id, item.isBought)} className="flex items-center gap-3 flex-1 cursor-pointer">
                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center bg-green-500 border-green-500">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium line-through text-gray-400">
                            {item.names?.[lang] || item.originalName}
                          </h3>
                          <div className="text-[11px] text-gray-400 flex flex-wrap gap-2 items-center mt-0.5">
                            <span className="font-bold">{item.amount} {t[`unit_${item.unit}` as keyof typeof t] || item.unit}</span>
                            {item.estimatedPrice > 0 && <span className="font-bold">{item.estimatedPrice} €</span>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => archiveItem(item.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* B1: BARKOD TARAYICI MODAL */}
        {isScannerOpen && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
              <div className="bg-purple-600 p-4 flex justify-between items-center">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <ScanLine className="w-5 h-5" />
                  {t.scan_barcode}
                </h3>
                <button
                  onClick={() => setIsScannerOpen(false)}
                  className="text-white hover:bg-purple-700 rounded-full p-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <div id="barcode-reader" className="w-full"></div>
                <p className="text-sm text-gray-500 mt-3 text-center">
                  {t.scanning}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}