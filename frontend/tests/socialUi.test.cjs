const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const load = require("./load-ts.cjs");
const { profileHref, friendshipForUser } = load(path.join(__dirname, "../services/social.ts"));

test("profile links encode usernames as a single route segment", () => {
  assert.equal(profileHref("someone_123"), "/users/someone_123");
  assert.equal(profileHref("a/b?name=<script>"), "/users/a%2Fb%3Fname%3D%3Cscript%3E");
});

test("friendship controls distinguish self, accepted and request direction by user ID", () => {
  const person = id => ({ id, username: `user${id}`, hasAvatar: false });
  const data = { friends: [person(2)], incoming: [person(3)], outgoing: [person(4)] };
  assert.equal(friendshipForUser(1, 1, data), "SELF");
  assert.equal(friendshipForUser(2, 1, data), "FRIENDS");
  assert.equal(friendshipForUser(3, 1, data), "INCOMING");
  assert.equal(friendshipForUser(4, 1, data), "OUTGOING");
  assert.equal(friendshipForUser(5, 1, data), "NONE");
  assert.equal(friendshipForUser(2, 1, null), "NONE");
});
