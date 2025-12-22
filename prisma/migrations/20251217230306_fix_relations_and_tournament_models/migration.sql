/*
  Warnings:

  - You are about to drop the column `is_active` on the `tournaments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[competitor_id,category_id]` on the table `robots` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tournament_id,club_id]` on the table `tournament_registrations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tournament_id,competitor_id]` on the table `tournament_registrations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `club_id` to the `tournament_registrations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category_id` to the `tournaments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `max_participants` to the `tournaments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `competitors` ADD COLUMN `last_tournament_end` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `tournament_registrations` ADD COLUMN `club_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `tournaments` DROP COLUMN `is_active`,
    ADD COLUMN `category_id` INTEGER NOT NULL,
    ADD COLUMN `max_participants` INTEGER NOT NULL,
    ADD COLUMN `status` ENUM('draft', 'active', 'finished', 'cancelled') NOT NULL DEFAULT 'draft',
    ADD COLUMN `winner_club_id` INTEGER NULL,
    ADD COLUMN `winner_competitor_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `club_scores` (
    `club_id` INTEGER NOT NULL,
    `total_points` DECIMAL(65, 30) NOT NULL DEFAULT 0,

    PRIMARY KEY (`club_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competitor_scores` (
    `competitor_id` INTEGER NOT NULL,
    `total_points` DECIMAL(65, 30) NOT NULL DEFAULT 0,

    PRIMARY KEY (`competitor_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_prizes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournament_id` INTEGER NOT NULL,
    `competitor_id` INTEGER NOT NULL,
    `club_id` INTEGER NOT NULL,
    `prize` VARCHAR(191) NOT NULL,
    `victory_type` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament_matches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournament_id` INTEGER NOT NULL,
    `round_number` INTEGER NOT NULL,
    `competitor_a` INTEGER NOT NULL,
    `competitor_b` INTEGER NOT NULL,
    `winner_id` INTEGER NULL,
    `judge_id` INTEGER NOT NULL,
    `duration_sec` INTEGER NOT NULL,
    `victory_type` VARCHAR(191) NULL,
    `status` ENUM('pending', 'ongoing', 'finished') NOT NULL DEFAULT 'pending',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `robots_competitor_id_category_id_key` ON `robots`(`competitor_id`, `category_id`);

-- CreateIndex
CREATE UNIQUE INDEX `tournament_registrations_tournament_id_club_id_key` ON `tournament_registrations`(`tournament_id`, `club_id`);

-- CreateIndex
CREATE UNIQUE INDEX `tournament_registrations_tournament_id_competitor_id_key` ON `tournament_registrations`(`tournament_id`, `competitor_id`);

-- AddForeignKey
ALTER TABLE `tournament_registrations` ADD CONSTRAINT `tournament_registrations_club_id_fkey` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tournaments` ADD CONSTRAINT `tournaments_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tournament_prizes` ADD CONSTRAINT `tournament_prizes_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_prizes` ADD CONSTRAINT `tournament_prizes_competitor_id_fkey` FOREIGN KEY (`competitor_id`) REFERENCES `competitors`(`user_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tournament_prizes` ADD CONSTRAINT `tournament_prizes_club_id_fkey` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tournament_matches` ADD CONSTRAINT `tournament_matches_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_matches` ADD CONSTRAINT `tournament_matches_judge_id_fkey` FOREIGN KEY (`judge_id`) REFERENCES `judges`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_matches` ADD CONSTRAINT `tournament_matches_competitor_a_fkey` FOREIGN KEY (`competitor_a`) REFERENCES `competitors`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_matches` ADD CONSTRAINT `tournament_matches_competitor_b_fkey` FOREIGN KEY (`competitor_b`) REFERENCES `competitors`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
