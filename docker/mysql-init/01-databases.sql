-- Script de inicialización de MySQL — se ejecuta SOLO la primera vez que
-- el container arranca con un volumen vacío. Crea las 3 BDs y otorga
-- permisos al usuario definido en MYSQL_USER.

CREATE DATABASE IF NOT EXISTS webexams_users
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS webexams
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS webexamsattempts
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- El usuario MYSQL_USER se crea automáticamente por la imagen de MySQL,
-- pero solo recibe permisos sobre MYSQL_DATABASE. Le damos acceso a las otras 2.
GRANT ALL PRIVILEGES ON webexams_users.*    TO 'webexams_user'@'%';
GRANT ALL PRIVILEGES ON webexams.*          TO 'webexams_user'@'%';
GRANT ALL PRIVILEGES ON webexamsattempts.*  TO 'webexams_user'@'%';

FLUSH PRIVILEGES;
