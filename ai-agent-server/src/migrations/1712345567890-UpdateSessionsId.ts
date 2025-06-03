import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSessionsId1712345567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create UUID extension if it doesn't exist
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Update sessions with null IDs using uuid_generate_v4()
        await queryRunner.query(`
            UPDATE sessions 
            SET id = uuid_generate_v4() 
            WHERE id IS NULL
        `);

        // Make id column not nullable
        await queryRunner.query(`
            ALTER TABLE sessions 
            ALTER COLUMN id SET NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No need to revert the changes as we're fixing data
    }
} 