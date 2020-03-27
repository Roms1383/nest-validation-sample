import * as Joi from '@hapi/joi'
import { Body, Controller, Module, NotImplementedException, Post, UsePipes } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import axios from 'axios'
import * as Joiful from 'joiful'

import { ValidationPipe } from './validation.pipe'

class Implicit {
  @Joiful.string().required()
  mandatory: string
  @Joiful.string().optional()
  optional?: string
}

const additional = Joi.object({
  additional: Joi.string().required()
})

@Controller()
class Routes {
  @UsePipes(ValidationPipe)
  @Post('incorrect')
  incorrect(@Body() body: any) { return true }

  @UsePipes(ValidationPipe)
  @Post('implicit')
  implicit(@Body() body: Implicit) { return true }

  @UsePipes(ValidationPipe)
  @Post('implicits')
  implicits(@Body() body: Implicit) { return true }

  @UsePipes(new ValidationPipe([Implicit, additional]))
  @Post('explicit')
  explicit(@Body() body: any) { return true }

  @UsePipes(new ValidationPipe([Implicit, additional], true))
  @Post('explicits')
  explicits(@Body() body: any) { return true }
}


@Module({
  controllers: [Routes]
})
class MainModule {}

const bootstrap = async () => {
  const app = await NestFactory.create(MainModule, { logger: false })
  await app.listen(3000)
  return app
}

const teardown = async app => {
  await app.close()
  app = undefined
  return true
}

describe('ValidationPipe', () => {
  let app = undefined
  beforeAll(async () => {
    app = await bootstrap()
  })
  afterAll(async () => {
    await teardown(app)
  })
  describe('incorrectly implemented', () => {
    it('should fail if not implemented correctly on Controller', async () => {
      expect(axios.post('http://localhost:3000/incorrect', {}))
      .rejects
      .toThrow('Request failed with status code 500')
    })
  })
  describe('implicit validation from decorated class', () => {
    it('should fail with empty payload', async () => {
      const payload = {}
      expect(axios.post('http://localhost:3000/implicit', payload))
      .rejects
      .toThrow()
    })
    it('should fail with missing mandatory parameter in payload', async () => {
      const payload = { optional: 'some optional parameter' }
      expect(axios.post('http://localhost:3000/implicit', payload))
      .rejects
      .toThrow()
    })
    it('should succeed with valid payload', async () => {
      const payload = { mandatory: 'some mandatory parameter', optional: 'some optional parameter' }
      const { data } = await axios.post('http://localhost:3000/implicit', payload)
      expect(data)
      .toBe(true)
    })
  })
  describe('implicit validation from decorated class with an array as payload', () => {
    it('should fail with at least one empty payload item', async () => {
      const payload = [
        { mandatory: 'some mandatory parameter', optional: 'some optional parameter' },
        {},
      ]
      expect(axios.post('http://localhost:3000/implicits', payload))
      .rejects
      .toThrow()
    })
    it('should fail with at least one missing mandatory parameter in payload item', async () => {
      const payload = [
        { mandatory: 'some mandatory parameter', optional: 'some optional parameter' },
        { optional: 'another optional parameter' },
      ]
      expect(axios.post('http://localhost:3000/implicits', payload))
      .rejects
      .toThrow()
    })
    it('should succeed with valid payload for all items', async () => {
      const payload = [
        { mandatory: 'some mandatory parameter', optional: 'some optional parameter' },
        { mandatory: 'another mandatory parameter', optional: 'another optional parameter' },
      ]
      const { data } = await axios.post('http://localhost:3000/implicits', payload)
      expect(data)
      .toBe(true)
    })
  })
  describe('validation from mix of decorated class(es) and schema(s)', () => {
    it('should fail with empty payload', async () => {
      const payload = {}
      expect(axios.post('http://localhost:3000/explicit', payload))
      .rejects
      .toThrow()
    })
    it('should fail with missing required parameter in payload', async () => {
      const payload = { mandatory: 'some mandatory parameter', optional: 'some optional parameter' }
      expect(axios.post('http://localhost:3000/explicit', payload))
      .rejects
      .toThrow()
    })
    it('should succeed with valid payload', async () => {
      const payload = { mandatory: 'some mandatory parameter', optional: 'some optional parameter', additional: 'some additional required parameter' }
      const { data } = await axios.post('http://localhost:3000/explicit', payload)
      expect(data)
      .toBe(true)
    })
  })
  describe('validation from mix of decorated class(es) and schema(s) with array as payload', () => {
    it('should fail with at least one empty payload item', async () => {
      const payload = [
        { mandatory: 'some mandatory parameter', optional: 'some optional parameter', additional: 'some additional required parameter' },
        {},
      ]
      expect(axios.post('http://localhost:3000/explicits', payload))
      .rejects
      .toThrow()
    })
    it('should fail with at least one missing mandatory parameter in payload item', async () => {
      const payload = [
        { mandatory: 'some mandatory parameter', optional: 'some optional parameter', additional: 'some additional required parameter' },
        { optional: 'another optional parameter' },
      ]
      expect(axios.post('http://localhost:3000/explicits', payload))
      .rejects
      .toThrow()
    })
    it('should succeed with valid payload for all items', async () => {
      const payload = [
        { mandatory: 'some mandatory parameter', optional: 'some optional parameter', additional: 'some additional required parameter' },
        { mandatory: 'another mandatory parameter', optional: 'another optional parameter', additional: 'another additional required parameter' },
      ]
      const { data } = await axios.post('http://localhost:3000/explicits', payload)
      expect(data)
      .toBe(true)
    })
  })
})