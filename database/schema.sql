CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    fullname    VARCHAR(150)        NOT NULL,
    email       VARCHAR(150)        NOT NULL UNIQUE,
    phone       VARCHAR(20),
    address     VARCHAR(255),
    password    VARCHAR(255)        NOT NULL,
    role        ENUM('user','admin') DEFAULT 'user',
    google_id   VARCHAR(255)        DEFAULT NULL,
    profile_photo VARCHAR(500)      DEFAULT NULL,
    created_at  TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    is_verified TINYINT(1) DEFAULT 0,
    verification_code VARCHAR(10) DEFAULT NULL,
    code_expires_at TIMESTAMP DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id  VARCHAR(128)    NOT NULL PRIMARY KEY,
    expires     INT(11)         UNSIGNED NOT NULL,
    data        MEDIUMTEXT
);

CREATE TABLE IF NOT EXISTS products (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150)    NOT NULL,
    category    VARCHAR(100)    DEFAULT 'Flowers',
    price       DECIMAL(10,2)   NOT NULL,
    stock       INT             DEFAULT 0,
    image       VARCHAR(255),
    description TEXT,
    status      ENUM('active','inactive') DEFAULT 'active',
    is_default  TINYINT(1)      DEFAULT 0,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO products (name, category, price, stock, image, description, status, is_default) VALUES
('Roses','Flowers',1200.00,50,'images/realroses.jpeg','The eternal symbol of love and passion.','active',1),
('Tulips','Flowers',1500.00,40,'images/tulips.jpeg','Elegant blooms that whisper joy and grace.','active',1),
('Sunflowers','Flowers',1000.00,60,'images/sunflowers.jpeg','Golden rays of happiness that brighten every heart.','active',1),
('Lilies','Flowers',1300.00,35,'images/lilies.jpeg','Pure and graceful blossoms that embody devotion and renewal.','active',1),
('Orchids','Flowers',1800.00,25,'images/orchids.jpeg','Exquisite and timeless, orchids speak of beauty and admiration.','active',1),
('Carnations','Flowers',1100.00,45,'images/carnations.jpeg','Delicate blooms of love and gratitude.','active',1),
('Peonies','Flowers',1600.00,30,'images/peonies.jpeg','Romantic and lush, peonies symbolize prosperity and love.','active',1),
('Daisies','Flowers',900.00,55,'images/daisies.jpeg','Bright and cheerful blossoms of innocence and friendship.','active',1),
('Lavender','Flowers',950.00,50,'images/lavender.jpeg','Fragrant stems of calm and devotion.','active',1);

CREATE TABLE IF NOT EXISTS cart (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT             NOT NULL,
    product_id  INT             NOT NULL,
    quantity    INT             DEFAULT 1,
    selected    TINYINT(1)      DEFAULT 0,
    added_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    order_code           VARCHAR(50)     NOT NULL UNIQUE,
    user_id              INT,
    fullname             VARCHAR(150),
    email                VARCHAR(150),
    phone                VARCHAR(20),
    address              VARCHAR(255),
    additional_info      TEXT,
    delivery_instructions TEXT,
    shipping_method      VARCHAR(50)     DEFAULT 'standard',
    payment_method       VARCHAR(50)     DEFAULT 'cod',
    subtotal             DECIMAL(10,2)   DEFAULT 0,
    delivery_fee         DECIMAL(10,2)   DEFAULT 0,
    total                DECIMAL(10,2)   DEFAULT 0,
    status               ENUM('Pending','Processing','Shipped','Delivered','Cancelled') DEFAULT 'Pending',
    created_at           TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id    INT             NOT NULL,
    product_id  INT,
    name        VARCHAR(150),
    price       DECIMAL(10,2),
    quantity    INT             DEFAULT 1,
    image       VARCHAR(255),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT,
    name        VARCHAR(150)    NOT NULL,
    email       VARCHAR(150)    NOT NULL,
    message     TEXT            NOT NULL,
    reply       TEXT            DEFAULT NULL,
    replied_at  TIMESTAMP       DEFAULT NULL,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);