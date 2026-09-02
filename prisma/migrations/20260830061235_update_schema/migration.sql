/*
  Warnings:

  - The primary key for the `documents` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_by` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `current_version` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `folder_id` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `is_archived` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `last_modified_by` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `visibility` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `workspace_id` on the `documents` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `password_hash` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `document_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `folders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organization_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organizations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `workspaces` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `owner_id` to the `documents` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DocumentRole" AS ENUM ('VIEWER', 'EDITOR', 'ADMIN');

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_document_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "document_permissions" DROP CONSTRAINT "document_permissions_document_id_fkey";

-- DropForeignKey
ALTER TABLE "document_permissions" DROP CONSTRAINT "document_permissions_granted_by_fkey";

-- DropForeignKey
ALTER TABLE "document_permissions" DROP CONSTRAINT "document_permissions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_created_by_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_folder_id_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_last_modified_by_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "folders" DROP CONSTRAINT "folders_created_by_fkey";

-- DropForeignKey
ALTER TABLE "folders" DROP CONSTRAINT "folders_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "folders" DROP CONSTRAINT "folders_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "organization_members" DROP CONSTRAINT "organization_members_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "organization_members" DROP CONSTRAINT "organization_members_user_id_fkey";

-- DropForeignKey
ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_organization_id_fkey";

-- DropIndex
DROP INDEX "idx_documents_workspace_folder";

-- AlterTable
ALTER TABLE "documents" DROP CONSTRAINT "documents_pkey",
DROP COLUMN "created_by",
DROP COLUMN "current_version",
DROP COLUMN "folder_id",
DROP COLUMN "is_archived",
DROP COLUMN "last_modified_by",
DROP COLUMN "visibility",
DROP COLUMN "workspace_id",
ADD COLUMN     "owner_id" TEXT NOT NULL,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "title" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "password_hash",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "audit_logs";

-- DropTable
DROP TABLE "document_permissions";

-- DropTable
DROP TABLE "folders";

-- DropTable
DROP TABLE "organization_members";

-- DropTable
DROP TABLE "organizations";

-- DropTable
DROP TABLE "workspaces";

-- DropEnum
DROP TYPE "audit_action";

-- DropEnum
DROP TYPE "doc_visibility";

-- DropEnum
DROP TYPE "role_type";

-- CreateTable
CREATE TABLE "document_members" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "DocumentRole" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_members_user_id_idx" ON "document_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_members_document_id_user_id_key" ON "document_members"("document_id", "user_id");

-- CreateIndex
CREATE INDEX "documents_owner_id_idx" ON "documents"("owner_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_members" ADD CONSTRAINT "document_members_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_members" ADD CONSTRAINT "document_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
