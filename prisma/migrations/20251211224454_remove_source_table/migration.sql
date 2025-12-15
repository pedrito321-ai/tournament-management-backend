/*
  Warnings:

  - You are about to drop the column `source_id` on the `news` table. All the data in the column will be lost.
  - You are about to drop the `sources` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `news` DROP FOREIGN KEY `news_source_id_fkey`;

-- DropIndex
DROP INDEX `news_source_id_idx` ON `news`;

-- AlterTable
ALTER TABLE `news` DROP COLUMN `source_id`,
    ADD COLUMN `source_link` TEXT NULL,
    ADD COLUMN `source_logo_url` TEXT NULL,
    ADD COLUMN `source_name` VARCHAR(255) NULL;

-- DropTable
DROP TABLE `sources`;
