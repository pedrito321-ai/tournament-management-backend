/*
  Warnings:

  - Made the column `is_active` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `users` MODIFY `is_active` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `user_blocks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `blocked_by` INTEGER NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('pending', 'active', 'lifted') NOT NULL DEFAULT 'pending',
    `blocked_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `unblocked_at` DATETIME(3) NULL,

    INDEX `user_blocks_user_id_idx`(`user_id`),
    INDEX `user_blocks_blocked_by_idx`(`blocked_by`),
    INDEX `user_blocks_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_blocks` ADD CONSTRAINT `user_blocks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_blocks` ADD CONSTRAINT `user_blocks_blocked_by_fkey` FOREIGN KEY (`blocked_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
