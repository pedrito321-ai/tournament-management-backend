/*
  Warnings:

  - You are about to drop the column `source` on the `news` table. All the data in the column will be lost.
  - Made the column `created_at` on table `news` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `news` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `news` DROP COLUMN `source`,
    ADD COLUMN `source_id` INTEGER NULL,
    MODIFY `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    MODIFY `updated_at` TIMESTAMP(0) NOT NULL;

-- CreateTable
CREATE TABLE `sources` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `link` TEXT NULL,
    `logo_url` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `news_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `news_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,

    INDEX `news_categories_news_id_idx`(`news_id`),
    INDEX `news_categories_category_id_idx`(`category_id`),
    UNIQUE INDEX `news_categories_news_id_category_id_key`(`news_id`, `category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `news_source_id_idx` ON `news`(`source_id`);

-- AddForeignKey
ALTER TABLE `news` ADD CONSTRAINT `news_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `news_categories` ADD CONSTRAINT `news_categories_news_id_fkey` FOREIGN KEY (`news_id`) REFERENCES `news`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `news_categories` ADD CONSTRAINT `news_categories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
