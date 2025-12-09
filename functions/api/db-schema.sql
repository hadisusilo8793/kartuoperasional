-- KartuOperasional D1 Database Schema
DROP TABLE IF EXISTS kartu;
CREATE TABLE kartu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nomor TEXT UNIQUE NOT NULL,
    serial TEXT UNIQUE NOT NULL,
    jenis TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'AKTIF', -- AKTIF / NONAKTIF
    saldo INTEGER NOT NULL DEFAULT 0,
    status_pinjam TEXT NOT NULL DEFAULT 'TERSEDIA' -- TERSEDIA / DIPINJAM
);
DROP TABLE IF EXISTS driver;
CREATE TABLE driver (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nik TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'AKTIF' -- AKTIF / NONAKTIF
);
DROP TABLE IF EXISTS armada;
CREATE TABLE armada (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nomor_armada TEXT UNIQUE NOT NULL,
    jenis TEXT NOT NULL,
    plat TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'AKTIF' -- AKTIF / NONAKTIF
);
DROP TABLE IF EXISTS gate;
CREATE TABLE gate (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    kategori TEXT NOT NULL, -- TOL / PARKIR
    area TEXT,
    status TEXT NOT NULL DEFAULT 'AKTIF' -- AKTIF / NONAKTIF
);
DROP TABLE IF EXISTS transaksi;
CREATE TABLE transaksi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kartu_id INTEGER,
    driver_id INTEGER,
    armada_id INTEGER,
    saldo_awal INTEGER,
    gate_in_out TEXT, -- JSON: [{gate_id, biaya}]
    parkir TEXT, -- JSON: [{lokasi, biaya}]
    total_tol INTEGER,
    total_parkir INTEGER,
    total_biaya INTEGER,
    tujuan TEXT,
    kondisi TEXT,
    deskripsi TEXT,
    status TEXT, -- AKTIF / SELESAI
    waktu_pinjam TEXT,
    waktu_kembali TEXT,
    FOREIGN KEY (kartu_id) REFERENCES kartu(id),
    FOREIGN KEY (driver_id) REFERENCES driver(id),
    FOREIGN KEY (armada_id) REFERENCES armada(id)
);
DROP TABLE IF EXISTS pinjaman_aktif;
CREATE TABLE pinjaman_aktif (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaksi_id INTEGER UNIQUE NOT NULL,
    kartu_id INTEGER NOT NULL,
    driver_id INTEGER NOT NULL,
    armada_id INTEGER NOT NULL,
    waktu_pinjam TEXT NOT NULL,
    tujuan TEXT,
    FOREIGN KEY (transaksi_id) REFERENCES transaksi(id)
);
DROP TABLE IF EXISTS setting;
CREATE TABLE setting (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Enforce single row
    max_per_hari INTEGER DEFAULT 3,
    min_saldo INTEGER DEFAULT 30000,
    max_saldo INTEGER DEFAULT 50000
);
DROP TABLE IF EXISTS logs;
CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    waktu TEXT NOT NULL,
    level TEXT NOT NULL, -- INFO, WARNING, ERROR
    pesan TEXT NOT NULL
);