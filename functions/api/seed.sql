-- Seed data for KartuOperasional
-- Ensure tables are created
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
-- Seed initial settings
INSERT OR IGNORE INTO setting (id, max_per_hari, min_saldo, max_saldo) VALUES (1, 3, 30000, 50000);
-- Seed sample data for demonstration
INSERT OR IGNORE INTO kartu (nomor, serial, jenis, saldo, status_pinjam) VALUES
('001', 'SN001', 'E-MONEY', 150000, 'TERSEDIA'),
('002', 'SN002', 'FLAZZ', 25000, 'TERSEDIA'),
('003', 'SN003', 'TAPCASH', 200000, 'DIPINJAM');
INSERT OR IGNORE INTO driver (nik, nama) VALUES
('1234567890123456', 'Budi Santoso'),
('2345678901234567', 'Citra Lestari');
INSERT OR IGNORE INTO armada (nomor_armada, jenis, plat) VALUES
('A01', 'TRUCK', 'B 1234 CD'),
('A02', 'PICKUP', 'D 5678 EF');
INSERT OR IGNORE INTO gate (kode, nama, kategori, area) VALUES
('GT-CKP', 'Gerbang Tol Cikampek', 'TOL', 'Jawa Barat'),
('PK-SBD', 'Parkir Subang', 'PARKIR', 'Jawa Barat');