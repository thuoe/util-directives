import { fetchDirective } from '@src/utils'
import { MapperKind, mapSchema } from '@graphql-tools/utils'
import { GraphQLError, GraphQLSchema, defaultFieldResolver } from 'graphql'
import { CurrencyCode } from '@src/types'
import * as cheerio from 'cheerio'

type CurrencyDirectiveArgs = {
  from: CurrencyCode
  to: CurrencyCode
}

const generateGraphQLEnum = (origin: Record<string, string>) => {
  const formattedCodes = Object.keys(origin).map((code) => {
    return `${code} \n`
  }).join('')
  const result = `enum CurrencyCode {\n${formattedCodes} }`
  return result
}

const validateCodes = (...codes: string[]) => {
  const validCodes = Object.keys(CurrencyCode)
  const invalidCodes = codes.filter(code => !validCodes.includes(code))
  if (invalidCodes.length > 0) {
    throw new GraphQLError(`Currency codes: ${invalidCodes} are not valid!`)
  }
}

const fetchAmount = async ({ originalAmount, from, to }: { originalAmount: number, from: CurrencyCode, to: CurrencyCode }) => {
  try {
    const response = await fetch(`https://www.google.com/search?q=${originalAmount}+${from}+to+${to}+&hl=en`)
    const html = await response.text()
    const $ = cheerio.load(html)
    const $input = $('.iBp4i') // TODO: hacky... find better selector
    const amount = $input.text().split(' ')[0]
    return amount
  } catch (error) {
    throw new GraphQLError(`Error converting amount ${originalAmount} from ${from} to ${to}!`, error)
  }
}

const currencyDirective = (directiveName: string = 'currency') => {
  return {
    currencyDirectiveTypeDefs: `directive @${directiveName} (from: String!, to: String!) on FIELD_DEFINITION
      ${generateGraphQLEnum(CurrencyCode)}
  `,
    currencyDirectiveTransformer: (schema: GraphQLSchema) => mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const currencyDirective = fetchDirective<CurrencyDirectiveArgs>(schema, fieldConfig, directiveName)
        if (currencyDirective) {
          const { from, to } = currencyDirective
          const { resolve = defaultFieldResolver } = fieldConfig
          return {
            ...fieldConfig,
            resolve: async (source, args, context, info) => {
              validateCodes(from, to)
              const { fieldName, returnType } = info
              const type = returnType.toString()
              if (type !== 'String' && type !== 'Float') {
                throw new GraphQLError(`Unable to validate field "${fieldName}" of type ${type}. @currency directive can only be used on scalar type String or Float`)
              }
              const value = await resolve(source, args, context, info)
              const amount = fetchAmount({ originalAmount: value as number, from, to })
              return amount
            }
          }

        }
      }
    })
  }
}

export default currencyDirective
