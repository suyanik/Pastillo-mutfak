"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import { Calendar, FileText, ChefHat, ArrowLeft, Filter } from "lucide-react";
import Link from "next/link";

type LangCode = "tr" | "de" | "pa";

const DICTIONARY = {
  tr: {
    title: "Raporlar",
    back: "Geri Dön",
    selectMonth: "Ay Seçin",
    allMonths: "Tüm Zamanlar",
    loading: "Yükleniyor...",
    noData: "Bu ay için veri yok",
    total: "Toplam",
    items: "ürün",
    bought: "Alındı",
    pending: "Bekliyor",
    requestedBy: "İsteyen",
    requestedAt: "İstenme Tarihi",
    boughtAt: "Alınma Tarihi",
    category: "Kategori",
    amount: "Miktar",
    status: "Durum",
    role_chef: "Şef",
    role_bar: "Bar",
    role_kitchen: "Mutfak",
    cat_metro: "Metro",
    cat_veg: "Sebze",
    cat_meat: "Kasap",
    cat_drink: "İçecek",
    cat_other: "Diğer",
    unit_kg: "Kg",
    unit_pcs: "Adet",
    unit_box: "Kasa",
    unit_pack: "Paket",
    unit_bag: "Çuval",
  },
  de: {
    title: "Berichte",
    back: "Zurück",
    selectMonth: "Monat wählen",
    allMonths: "Alle Zeiten",
    loading: "Laden...",
    noData: "Keine Daten für diesen Monat",
    total: "Gesamt",
    items: "Artikel",
    bought: "Gekauft",
    pending: "Ausstehend",
    requestedBy: "Angefordert von",
    requestedAt: "Angefordert am",
    boughtAt: "Gekauft am",
    category: "Kategorie",
    amount: "Menge",
    status: "Status",
    role_chef: "Chef",
    role_bar: "Bar",
    role_kitchen: "Küche",
    cat_metro: "Metro",
    cat_veg: "Gemüse",
    cat_meat: "Fleisch",
    cat_drink: "Getränke",
    cat_other: "Andere",
    unit_kg: "Kg",
    unit_pcs: "Stück",
    unit_box: "Kiste",
    unit_pack: "Packung",
    unit_bag: "Sack",
  },
  pa: {
    title: "ਰਿਪੋਰਟਾਂ",
    back: "ਵਾਪਸ",
    selectMonth: "ਮਹੀਨਾ ਚੁਣੋ",
    allMonths: "ਸਾਰੇ ਸਮੇਂ",
    loading: "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...",
    noData: "ਇਸ ਮਹੀਨੇ ਲਈ ਕੋਈ ਡੇਟਾ ਨਹੀਂ",
    total: "ਕੁੱਲ",
    items: "ਆਈਟਮਾਂ",
    bought: "ਖਰੀਦਿਆ",
    pending: "ਬਾਕੀ",
    requestedBy: "ਮੰਗਿਆ",
    requestedAt: "ਮੰਗਿਆ ਤਾਰੀਖ",
    boughtAt: "ਖਰੀਦਿਆ ਤਾਰੀਖ",
    category: "ਸ਼੍ਰੇਣੀ",
    amount: "ਮਾਤਰਾ",
    status: "ਸਥਿਤੀ",
    role_chef: "ਸ਼ੈੱਫ",
    role_bar: "ਬਾਰ",
    role_kitchen: "ਰਸੋਈ",
    cat_metro: "ਮੈਟਰੋ",
    cat_veg: "ਸਬਜ਼ੀ",
    cat_meat: "ਮੀਟ",
    cat_drink: "ਪੀਣ ਵਾਲੇ",
    cat_other: "ਹੋਰ",
    unit_kg: "ਕਿਲੋ",
    unit_pcs: "ਟੁਕੜਾ",
    unit_box: "ਬਾਕਸ",
    unit_pack: "ਪੈਕਟ",
    unit_bag: "ਬੋਰੀ",
  }
};

interface ReportItem {
  id: string;
  originalName: string;
  names: { tr: string; de: string; pa: string };
  category: string;
  amount: string;
  unit: string;
  requester: string;
  isBought: boolean;
  createdAt: Timestamp;
  boughtAt: Timestamp | null;
}

export default function Reports() {
  const [lang, setLang] = useState<LangCode>("tr");
  const t = DICTIONARY[lang];

  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Mevcut ay ve son 6 ayı oluştur
  const generateMonths = () => {
    const months: { value: string; label: string }[] = [{ value: "all", label: t.allMonths }];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthNames = {
        tr: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
        de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
        pa: ["ਜਨਵਰੀ", "ਫਰਵਰੀ", "ਮਾਰਚ", "ਅਪ੍ਰੈਲ", "ਮਈ", "ਜੂਨ", "ਜੁਲਾਈ", "ਅਗਸਤ", "ਸਤੰਬਰ", "ਅਕਤੂਬਰ", "ਨਵੰਬਰ", "ਦਸੰਬਰ"]
      };

      const monthName = monthNames[lang][date.getMonth()];
      const year = date.getFullYear();
      const value = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      months.push({ value, label: `${monthName} ${year}` });
    }

    return months;
  };

  useEffect(() => {
    fetchReports();
  }, [selectedMonth]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // TÜM ÜRÜNLERİ ÇEK (Arşivlenmiş dahil - Raporlarda hepsi görünmeli)
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      let allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ReportItem[];

      // ✅ CLIENT-SIDE FİLTRELEME (Daha hızlı - tek sorgu)
      if (selectedMonth !== "all") {
        const [year, month] = selectedMonth.split("-");
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

        allItems = allItems.filter(item => {
          if (!item.createdAt) return false;
          const itemDate = item.createdAt.toDate();
          return itemDate >= startDate && itemDate <= endDate;
        });
      }

      setItems(allItems);
    } catch (error) {
      console.error("Rapor yükleme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate();
    return date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : 'pa-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = {
    total: items.length,
    bought: items.filter(i => i.isBought).length,
    pending: items.filter(i => !i.isBought).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              </Link>
              <FileText className="w-8 h-8 text-orange-600" />
              <h1 className="text-2xl font-bold text-gray-800">{t.title}</h1>
            </div>

            {/* Dil Seçici */}
            <div className="flex gap-2 bg-gray-800 rounded-lg p-1 border border-gray-700">
              {(["tr", "de", "pa"] as LangCode[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-4 py-2 rounded-md font-bold transition-all ${
                    lang === l
                      ? "bg-orange-600 text-white shadow-lg scale-105"
                      : "bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Ay Filtresi */}
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {generateMonths().map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
            <div className="text-sm text-gray-500">{t.total}</div>
            <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-xs text-gray-400">{t.items}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
            <div className="text-sm text-gray-500">{t.bought}</div>
            <div className="text-3xl font-bold text-green-600">{stats.bought}</div>
            <div className="text-xs text-gray-400">{t.items}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500">
            <div className="text-sm text-gray-500">{t.pending}</div>
            <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-xs text-gray-400">{t.items}</div>
          </div>
        </div>

        {/* Tablo */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-500">{t.loading}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">{t.noData}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">{t.status}</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Ürün</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">{t.category}</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">{t.amount}</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">{t.requestedBy}</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">{t.requestedAt}</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">{t.boughtAt}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          item.isBought
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}>
                          {item.isBought ? "✓" : "○"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {item.names?.[lang] || item.originalName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {t[`cat_${item.category}` as keyof typeof t]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-700">
                          {item.amount} {t[`unit_${item.unit}` as keyof typeof t]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold uppercase">
                          {t[`role_${item.requester || 'chef'}` as keyof typeof t]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(item.boughtAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
