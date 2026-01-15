-- CreateTable
CREATE TABLE `tournament_clubs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournament_id` INTEGER NOT NULL,
    `club_id` INTEGER NOT NULL,

    UNIQUE INDEX `tournament_clubs_tournament_id_club_id_key`(`tournament_id`, `club_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tournament_clubs` ADD CONSTRAINT `tournament_clubs_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament_clubs` ADD CONSTRAINT `tournament_clubs_club_id_fkey` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
