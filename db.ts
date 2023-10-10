export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
}

export interface Address {
  city: string;
  street: string;
}

const kv = await Deno.openKv();

export async function getAllUsers() {
  const users = [];
  for await (const res of kv.list({ prefix: ["user" ]})) {
    users.push(res.value);
  }
  return users;
}

export async function getUserById(id: string): Promise<User> {
  const key = ["user", id];
  return (await kv.get<User>(key)).value!;
}

export async function getUserByEmail(email: string) {
  const userByEmailKey = ["user_by_email", email];
  const id = (await kv.get(userByEmailKey)).value as string;
  const userKey = ["user", id];
  return (await kv.get<User>(userKey)).value!;
}

export async function getAddressByUserId(id: string) {
  const key = ["user_address", id];
  return (await kv.get<Address>(key)).value!;
}

export async function upsertUser(user: User) {
  const userKey = ["user", user.id];
  const userByEmailKey = ["user_by_email", user.email];

  const oldUser = await kv.get<User>(userKey);

  if (!oldUser.value) {
    const ok = await kv.atomic()
      .check(oldUser)
      .set(userByEmailKey, user.id)
      .set(userKey, user)
      .commit();
    if (!ok) throw new Error("Something went wrong.");
  } else {
    const ok = await kv.atomic()
      .check(oldUser)
      .delete(["user_by_email", oldUser.value.email])
      .set(userByEmailKey, user.id)
      .set(userKey, user)
      .commit();
    if (!ok) throw new Error("Something went wrong.");
  }
}

export async function updateUserAndAddress(user: User, address: Address) {
  const userKey = ["user", user.id];
  const userByEmailKey = ["user_by_email", user.email];
  const addressKey = ["user_address", user.id];

  const oldUser = await kv.get<User>(userKey);

  if (!oldUser.value) {
    const ok = await kv.atomic()
      .check(oldUser)
      .set(userByEmailKey, user.id)
      .set(userKey, user)
      .set(addressKey, address)
      .commit();
    if (!ok) throw new Error("Something went wrong.");
  } else {
    const ok = await kv.atomic()
      .check(oldUser)
      .delete(["user_by_email", oldUser.value.email])
      .set(userByEmailKey, user.id)
      .set(userKey, user)
      .set(addressKey, address)
      .commit();
    if (!ok) throw new Error("Something went wrong.");
  }
}

export async function deleteUserById(id: string) {
  const userKey = ["user", id];
  const userRes = await kv.get(userKey);
  if (!userRes.value) return;
  const userByEmailKey = ["user_by_email", userRes.value.email];
  const addressKey = ["user_address", id];

  await kv.atomic()
    .check(userRes)
    .delete(userKey)
    .delete(userByEmailKey)
    .delete(addressKey)
    .commit();
}