const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  }
}

module.exports = async () => {
  const config = await createJestConfig(customJestConfig)()
  config.transformIgnorePatterns = [
    '/node_modules/(?!(next-auth|@auth/core|@auth/prisma-adapter|jose|oauth4webapi)/)'
  ]
  return config
}
