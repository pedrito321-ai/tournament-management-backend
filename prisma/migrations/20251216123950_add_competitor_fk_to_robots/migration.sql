/*
  Warnings:

  - Added the required column `competitor_id` to the `robots` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `robots` ADD COLUMN `competitor_id` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `robots_competitor_id_idx` ON `robots`(`competitor_id`);

-- AddForeignKey
ALTER TABLE `robots` ADD CONSTRAINT `robots_competitor_id_fkey` FOREIGN KEY (`competitor_id`) REFERENCES `competitors`(`user_id`) ON DELETE CASCADE ON UPDATE NO ACTION;
