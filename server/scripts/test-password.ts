import bcrypt from "bcryptjs";

async function testPassword() {
  const password = "kemenkopmk";
  const hash = "$2y$10$/kZ9/4X1zioNvXjlx1VrTeeBphOPQI.cMK5iW2avdpRfDeIDzosMG";
  
  console.log("Testing password match:");
  console.log("Password:", password);
  console.log("Stored hash:", hash);
  
  const isMatch = await bcrypt.compare(password, hash);
  console.log("Result:", isMatch ? "Password matches!" : "Password does not match!");
}

testPassword();
