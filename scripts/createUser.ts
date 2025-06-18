import 'reflect-metadata';
import { AppDataSource } from '../server/data-source';
import { User, UserType } from '../server/entity/User';
import bcrypt from 'bcryptjs';

async function createUser(username: string, password: string, type: UserType = 'normal') {
  await AppDataSource.initialize();
  const userRepo = AppDataSource.getRepository(User);
  const exists = await userRepo.findOneBy({ username });
  if (!exists) {
    const hash = await bcrypt.hash(password, 10);
    const user = userRepo.create({ username, password: hash, type });
    await userRepo.save(user);
    console.log(`用户创建成功: ${username} (${type})`);
    return;
  }

  // 比对测试

  
  const saved = await userRepo.findOneBy({ username });
  if (!saved) {
    console.log('用户保存失败');
    process.exit(1);
  }
  const ok = await bcrypt.compare(password, saved.password);
  const fail = await bcrypt.compare('wrongpassword', saved.password);
  console.log('用正确密码比对:', ok ? '成功' : '失败');
  console.log('用错误密码比对:', fail ? '成功' : '失败');
  process.exit(0);
}

const [,, username, password, type] = process.argv;
if (!username || !password) {
  console.log('用法: ts-node createUser.ts <username> <password> [type]');
  console.log('type 可选值: normal, admin, guess (默认: normal)');
  process.exit(1);
}

// 验证 type 参数
const validTypes: UserType[] = ['normal', 'admin', 'guess'];
const userType = type && validTypes.includes(type as UserType) ? type as UserType : 'normal';

createUser(username, password, userType); 