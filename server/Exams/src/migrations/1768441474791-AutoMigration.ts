import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1768441474791 implements MigrationInterface {
    name = 'AutoMigration1768441474791'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`examenes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(255) NOT NULL, \`descripcion\` text NOT NULL, \`codigoExamen\` text NOT NULL, \`contrasena\` varchar(255) NULL, \`fecha_creacion\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`estado\` enum ('open', 'closed') NOT NULL, \`id_profesor\` int NOT NULL, \`necesitaNombreCompleto\` tinyint NOT NULL, \`necesitaCorreoElectrónico\` tinyint NOT NULL, \`necesitaCodigoEstudiantil\` tinyint NOT NULL, \`incluirHerramientaDibujo\` tinyint NOT NULL, \`incluirCalculadoraCientifica\` tinyint NOT NULL, \`incluirHojaExcel\` tinyint NOT NULL, \`incluirJavascript\` tinyint NOT NULL, \`incluirPython\` tinyint NOT NULL, \`horaApertura\` datetime NOT NULL, \`horaCierre\` datetime NOT NULL, \`limiteTiempo\` int NOT NULL, \`limiteTiempoCumplido\` enum ('enviar', 'descartar') NOT NULL, \`necesitaContrasena\` tinyint NOT NULL, \`consecuencia\` enum ('notificar', 'bloquear', 'ninguna') NOT NULL, \`archivoPDF\` varchar(255) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`question\` (\`id\` int NOT NULL AUTO_INCREMENT, \`enunciado\` varchar(255) NOT NULL, \`puntaje\` float NOT NULL DEFAULT '1', \`type\` varchar(255) NOT NULL, \`calificacionParcial\` tinyint NOT NULL, \`shuffleOptions\` tinyint NULL, \`nombreImagen\` text NULL, \`textoCorrecto\` text NULL, \`textoRespuesta\` text NULL, \`examId\` int NULL, INDEX \`IDX_91578dceeb42466b9285f29e4b\` (\`type\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`test_option\` (\`id\` int NOT NULL AUTO_INCREMENT, \`texto\` varchar(255) NOT NULL, \`esCorrecta\` tinyint NOT NULL DEFAULT 0, \`questionId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`blank_answer\` (\`id\` int NOT NULL AUTO_INCREMENT, \`posicion\` int NOT NULL, \`textoCorrecto\` varchar(255) NOT NULL, \`questionId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`open_question_keyword\` (\`id\` int NOT NULL AUTO_INCREMENT, \`texto\` varchar(255) NOT NULL, \`questionId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`match_item_a\` (\`id\` int NOT NULL AUTO_INCREMENT, \`text\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`match_item_b\` (\`id\` int NOT NULL AUTO_INCREMENT, \`text\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`match_pair\` (\`id\` int NOT NULL AUTO_INCREMENT, \`itemAId\` int NULL, \`itemBId\` int NULL, \`questionId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`question\` ADD CONSTRAINT \`FK_286bbf761d3af4e2fcac4a634d5\` FOREIGN KEY (\`examId\`) REFERENCES \`examenes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`test_option\` ADD CONSTRAINT \`FK_c708c4327cd2005db2fc1abdbca\` FOREIGN KEY (\`questionId\`) REFERENCES \`question\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`blank_answer\` ADD CONSTRAINT \`FK_5dfd93384ea149492258b910d11\` FOREIGN KEY (\`questionId\`) REFERENCES \`question\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`open_question_keyword\` ADD CONSTRAINT \`FK_3d02b26ed33c35586acde36ff70\` FOREIGN KEY (\`questionId\`) REFERENCES \`question\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`match_pair\` ADD CONSTRAINT \`FK_41944dc34a1c52fbafcbffe400e\` FOREIGN KEY (\`itemAId\`) REFERENCES \`match_item_a\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`match_pair\` ADD CONSTRAINT \`FK_e1fb43d6a39c0bdc1c867b5f2b3\` FOREIGN KEY (\`itemBId\`) REFERENCES \`match_item_b\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`match_pair\` ADD CONSTRAINT \`FK_0b982430794e67c36f955d702a3\` FOREIGN KEY (\`questionId\`) REFERENCES \`question\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`match_pair\` DROP FOREIGN KEY \`FK_0b982430794e67c36f955d702a3\``);
        await queryRunner.query(`ALTER TABLE \`match_pair\` DROP FOREIGN KEY \`FK_e1fb43d6a39c0bdc1c867b5f2b3\``);
        await queryRunner.query(`ALTER TABLE \`match_pair\` DROP FOREIGN KEY \`FK_41944dc34a1c52fbafcbffe400e\``);
        await queryRunner.query(`ALTER TABLE \`open_question_keyword\` DROP FOREIGN KEY \`FK_3d02b26ed33c35586acde36ff70\``);
        await queryRunner.query(`ALTER TABLE \`blank_answer\` DROP FOREIGN KEY \`FK_5dfd93384ea149492258b910d11\``);
        await queryRunner.query(`ALTER TABLE \`test_option\` DROP FOREIGN KEY \`FK_c708c4327cd2005db2fc1abdbca\``);
        await queryRunner.query(`ALTER TABLE \`question\` DROP FOREIGN KEY \`FK_286bbf761d3af4e2fcac4a634d5\``);
        await queryRunner.query(`DROP TABLE \`match_pair\``);
        await queryRunner.query(`DROP TABLE \`match_item_b\``);
        await queryRunner.query(`DROP TABLE \`match_item_a\``);
        await queryRunner.query(`DROP TABLE \`open_question_keyword\``);
        await queryRunner.query(`DROP TABLE \`blank_answer\``);
        await queryRunner.query(`DROP TABLE \`test_option\``);
        await queryRunner.query(`DROP INDEX \`IDX_91578dceeb42466b9285f29e4b\` ON \`question\``);
        await queryRunner.query(`DROP TABLE \`question\``);
        await queryRunner.query(`DROP TABLE \`examenes\``);
    }

}
