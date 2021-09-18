const User = require('./routes/users');

User.verifyPassword(
 'myPlainPassword',
 '$argon2id$v=19$m=65536,t=5,p=1$tzI7DoAFgP1Hpy0RTtsXhA$86HvxtOqNIKVGY0ZXBUDpSYN7uohZJfXTFpAGZqPuR8'
).then((passwordIsCorrect) => {
  console.log(passwordIsCorrect);
});
