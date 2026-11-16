import { test } from "node:test";
import assert from "node:assert/strict";
import { editStore, isEditing } from "./edit-store";

test("Preview mode turns editing off but keeps the editor session and drafts", () => {
  editStore.start();
  assert.equal(isEditing(editStore.get()), true);
  editStore.setPreview(true);
  assert.equal(editStore.get().on, true);
  assert.equal(isEditing(editStore.get()), false);
  editStore.setPreview(false);
  assert.equal(isEditing(editStore.get()), true);
  editStore.stop();
  assert.equal(isEditing(editStore.get()), false);
});
