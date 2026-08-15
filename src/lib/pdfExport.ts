import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate, todayISO } from './format';

interface PnLData {
  pendapatan: number;
  hpp: number;
  labaKotor: number;
  biayaTetap: number;
  biayaVariabel: number;
  depresiasi: number;
  labaBersih: number;
}

interface MarginRow {
  nama: string;
  qty: number;
  omzet: number;
  hppTotal: number;
  margin: number;
  marginPct: number;
  status: string;
}

interface TransaksiRow {
  tanggal: string;
  jenis: string;
  kategori: string;
  jumlah: number;
  keterangan: string;
}

interface StokRow {
  nama: string;
  satuan: string;
  stok: number;
  hargaBeli: number;
  nilaiStok: number;
}

const ROSE: [number, number, number] = [244, 63, 94];
const SLATE_DARK: [number, number, number] = [30, 41, 59];
const SLATE: [number, number, number] = [100, 116, 139];
const SLATE_LIGHT: [number, number, number] = [241, 245, 249];

function header(doc: jsPDF, title: string, periode: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...ROSE);
  doc.roundedRect(14, 14, 50, 14, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('BloomBook', 39, 23, { align: 'center' });

  doc.setTextColor(...SLATE_DARK);
  doc.setFontSize(16);
  doc.text(title, 14, 38);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE);
  doc.text(`Periode: ${periode}`, 14, 45);

  doc.setDrawColor(...SLATE_LIGHT);
  doc.setLineWidth(0.5);
  doc.line(14, 49, pageWidth - 14, 49);

  return 55;
}

function footer(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Dicetak pada ${formatDate(todayISO())} | BloomBook - Sistem Manajemen Toko Bunga`,
      14,
      pageHeight - 10,
    );
    doc.text(`Halaman ${i} / ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
  }
}

export function exportLabaRugiPDF(data: PnLData, periodeLabel: string) {
  const doc = new jsPDF();
  let y = header(doc, 'Laporan Laba Rugi', periodeLabel);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE_DARK);
  doc.text('Pendapatan', 14, y);
  doc.text(formatCurrency(data.pendapatan), 196, y, { align: 'right' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE);
  doc.text('HPP Terjual', 20, y);
  doc.text(`- ${formatCurrency(data.hpp)}`, 196, y, { align: 'right' });
  y += 7;

  doc.setDrawColor(...SLATE_LIGHT);
  doc.line(14, y - 2, 196, y - 2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE_DARK);
  doc.text('Laba Kotor', 14, y + 5);
  doc.text(formatCurrency(data.labaKotor), 196, y + 5, { align: 'right' });
  y += 14;

  doc.setFont('helvetica', 'bold');
  doc.text('Biaya Operasional:', 14, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE);
  doc.text('Biaya Tetap', 20, y);
  doc.text(`- ${formatCurrency(data.biayaTetap)}`, 196, y, { align: 'right' });
  y += 7;
  doc.text('Biaya Variabel Lain', 20, y);
  doc.text(`- ${formatCurrency(data.biayaVariabel)}`, 196, y, { align: 'right' });
  y += 7;
  doc.text('Penyusutan Investasi', 20, y);
  doc.text(`- ${formatCurrency(data.depresiasi)}`, 196, y, { align: 'right' });
  y += 7;

  doc.setDrawColor(...SLATE_LIGHT);
  doc.line(14, y - 2, 196, y - 2);

  const labaColor: [number, number, number] = data.labaBersih >= 0 ? [16, 185, 129] : [239, 68, 68];
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...labaColor);
  doc.setFontSize(13);
  doc.text('Laba Bersih', 14, y + 5);
  doc.text(formatCurrency(data.labaBersih), 196, y + 5, { align: 'right' });

  footer(doc);
  doc.save(`Laporan-Laba-Rugi-${todayISO()}.pdf`);
}

export function exportMarginPDF(rows: MarginRow[], periodeLabel: string) {
  const doc = new jsPDF();
  header(doc, 'Laporan Analisis Margin Produk', periodeLabel);

  autoTable(doc, {
    startY: 55,
    head: [['Produk', 'Qty Terjual', 'Omzet', 'HPP Total', 'Margin Rp', 'Margin %', 'Status']],
    body: rows.map((r) => [
      r.nama,
      String(r.qty),
      formatCurrency(r.omzet),
      formatCurrency(r.hppTotal),
      formatCurrency(r.margin),
      `${r.marginPct.toFixed(1)}%`,
      r.status,
    ]),
    headStyles: { fillColor: ROSE, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  footer(doc);
  doc.save(`Laporan-Analisis-Margin-${todayISO()}.pdf`);
}

export function exportTransaksiPDF(rows: TransaksiRow[], periodeLabel: string, totalMasuk: number, totalKeluar: number) {
  const doc = new jsPDF();
  header(doc, 'Laporan Transaksi', periodeLabel);

  autoTable(doc, {
    startY: 55,
    head: [['Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Jumlah']],
    body: rows.map((r) => [
      formatDate(r.tanggal),
      r.jenis === 'masuk' ? 'Masuk' : 'Keluar',
      r.kategori,
      r.keterangan || '-',
      `${r.jenis === 'masuk' ? '+' : '-'} ${formatCurrency(r.jumlah)}`,
    ]),
    headStyles: { fillColor: ROSE, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 4: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE_DARK);
  doc.text(`Total Pemasukan: ${formatCurrency(totalMasuk)}`, 14, finalY);
  doc.text(`Total Pengeluaran: ${formatCurrency(totalKeluar)}`, 14, finalY + 7);
  doc.text(`Selisih: ${formatCurrency(totalMasuk - totalKeluar)}`, 14, finalY + 14);

  footer(doc);
  doc.save(`Laporan-Transaksi-${todayISO()}.pdf`);
}

export function exportStokPDF(rows: StokRow[], totalNilaiStok: number) {
  const doc = new jsPDF();
  header(doc, 'Laporan Stok Bahan Baku', todayISO());

  autoTable(doc, {
    startY: 55,
    head: [['Bahan Baku', 'Satuan', 'Stok Saat Ini', 'Harga Beli', 'Nilai Stok']],
    body: rows.map((r) => [
      r.nama,
      r.satuan,
      String(r.stok),
      formatCurrency(r.hargaBeli),
      formatCurrency(r.nilaiStok),
    ]),
    headStyles: { fillColor: ROSE, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE_DARK);
  doc.text(`Total Nilai Stok: ${formatCurrency(totalNilaiStok)}`, 14, finalY);

  footer(doc);
  doc.save(`Laporan-Stok-${todayISO()}.pdf`);
}

export function exportGabunganPDF(
  pnl: PnLData,
  marginRows: MarginRow[],
  transaksiRows: TransaksiRow[],
  stokRows: StokRow[],
  totalNilaiStok: number,
  periodeLabel: string,
) {
  const doc = new jsPDF();
  header(doc, 'Laporan Gabungan Bulanan', periodeLabel);

  let y = 60;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE_DARK);
  doc.text('1. Laba Rugi', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Deskripsi', 'Jumlah']],
    body: [
      ['Pendapatan', formatCurrency(pnl.pendapatan)],
      ['HPP Terjual', `- ${formatCurrency(pnl.hpp)}`],
      ['Laba Kotor', formatCurrency(pnl.labaKotor)],
      ['Biaya Tetap', `- ${formatCurrency(pnl.biayaTetap)}`],
      ['Biaya Variabel', `- ${formatCurrency(pnl.biayaVariabel)}`],
      ['Penyusutan', `- ${formatCurrency(pnl.depresiasi)}`],
      ['Laba Bersih', formatCurrency(pnl.labaBersih)],
    ],
    headStyles: { fillColor: ROSE, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 12;
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE_DARK);
  doc.text('2. Analisis Margin Produk', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Produk', 'Qty', 'Margin Rp', 'Margin %', 'Status']],
    body: marginRows.map((r) => [r.nama, String(r.qty), formatCurrency(r.margin), `${r.marginPct.toFixed(1)}%`, r.status]),
    headStyles: { fillColor: ROSE, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 12;
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE_DARK);
  doc.text('3. Ringkasan Stok', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Bahan Baku', 'Stok', 'Nilai Stok']],
    body: stokRows.map((r) => [r.nama, `${r.stok} ${r.satuan}`, formatCurrency(r.nilaiStok)]),
    headStyles: { fillColor: ROSE, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 2: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Nilai Stok: ${formatCurrency(totalNilaiStok)}`, 14, y);

  footer(doc);
  doc.save(`Laporan-Gabungan-${todayISO()}.pdf`);
}
