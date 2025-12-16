/*
  Warnings:

  - You are about to drop the column `competitor_id` on the `robots` table. All the data in the column will be lost.
  - Added the required column `control_type` to the `robots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `robots` table without a default value. This is not possible if the table is not empty.
  - Made the column `created_at` on table `robots` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `robots` DROP FOREIGN KEY `robots_competitor_id_fkey`;

-- DropIndex
DROP INDEX `robots_competitor_id_idx` ON `robots`;

-- AlterTable
ALTER TABLE `robots` DROP COLUMN `competitor_id`,
    ADD COLUMN `control_type` ENUM('autonomous', 'remote', 'semi_autonomous') NOT NULL,
    ADD COLUMN `losses` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `matches_played` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `status` ENUM('active', 'inactive', 'disqualified', 'damaged') NOT NULL DEFAULT 'active',
    ADD COLUMN `updated_at` TIMESTAMP(0) NOT NULL,
    ADD COLUMN `wins` INTEGER NOT NULL DEFAULT 0,
    MODIFY `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0);

-- CreateIndex
CREATE INDEX `robots_status_idx` ON `robots`(`status`);
