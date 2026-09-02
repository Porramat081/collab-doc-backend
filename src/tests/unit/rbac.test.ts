import { DocumentRole, hasPermission } from "@/types/permission";

describe("RBAC Permissions Unit Tests", () => {
  test("OWNER should have access to all levels", () => {
    expect(hasPermission(DocumentRole.OWNER, DocumentRole.VIEWER)).toBe(true);
    expect(hasPermission(DocumentRole.OWNER, DocumentRole.EDITOR)).toBe(true);
    expect(hasPermission(DocumentRole.OWNER, DocumentRole.ADMIN)).toBe(true);
  });

  test("EDITOR should have VIEWER access but NOT ADMIN access", () => {
    expect(hasPermission(DocumentRole.EDITOR, DocumentRole.VIEWER)).toBe(true);
    expect(hasPermission(DocumentRole.EDITOR, DocumentRole.EDITOR)).toBe(true);
    expect(hasPermission(DocumentRole.EDITOR, DocumentRole.ADMIN)).toBe(false);
  });

  test("VIEWER should NOT have EDITOR or ADMIN access", () => {
    expect(hasPermission(DocumentRole.VIEWER, DocumentRole.VIEWER)).toBe(true);
    expect(hasPermission(DocumentRole.VIEWER, DocumentRole.EDITOR)).toBe(false);
    expect(hasPermission(DocumentRole.VIEWER, DocumentRole.ADMIN)).toBe(false);
  });
});
