import assert from 'assert'
import currencyDirective from '@src/directives/currency'
import { ApolloServer } from '@apollo/server'
import { buildSchema } from './util'


const { currencyDirectiveTypeDefs, currencyDirectiveTransformer } = currencyDirective()

describe('@currency directive', () => {
  const amount = 100
  let testServer: ApolloServer

  const resolvers = {
    Query: {
      user: () => ({
        amount
      })
    }
  }

  const testQuery = `
  query TestQuery {
    user {
      amount
    }
  }
  `

  afterEach(async () => {
    if (testServer) {
      await testServer.stop()
    }
    jest.restoreAllMocks()
  })

  it('will convert from one currency to another by fetching from URL', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch')
    const from = 'GBP'
    const to = 'USD'
    const schema = buildSchema({
      typeDefs: [
        `type User {
          amount: String @currency(from: "${from}", to: "${to}")
        }

        type Query {
          user: User
        }
        `,
        currencyDirectiveTypeDefs
      ],
      resolvers,
      transformers: [currencyDirectiveTransformer]
    })

    testServer = new ApolloServer({ schema })

    const response = await testServer.executeOperation<{ user: { amount: string } }>({
      query: testQuery
    })

    assert(response.body.kind === 'single')
    expect(response.body.singleResult.errors).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalled()
    expect(fetchSpy).toHaveBeenCalledWith(`https://www.google.com/search?q=${amount}+${from}+to+${to}+&hl=en`)
  })

  it('will throw an error if currency code(s) are not recognized', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch')
    const from = 'BLAH'
    const to = 'HMMMM'
    const schema = buildSchema({
      typeDefs: [
        `type User {
          amount: String @currency(from: "${from}", to: "${to}")
        }

        type Query {
          user: User
        }
        `,
        currencyDirectiveTypeDefs
      ],
      resolvers,
      transformers: [currencyDirectiveTransformer]
    })

    testServer = new ApolloServer({ schema })

    const response = await testServer.executeOperation<{ user: { amount: string } }>({
      query: testQuery
    })

    assert(response.body.kind === 'single')
    expect(response.body.singleResult.errors).toBeDefined();
    expect(response.body.singleResult.errors[0].message).toBe(`Currency codes: ${from},${to} are not valid!`);
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
