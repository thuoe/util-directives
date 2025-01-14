import { DirectableGraphQLObject, getDirective } from '@graphql-tools/utils'
import { GraphQLSchema } from 'graphql'

export const isValidDirective = <T extends Record<string, unknown>>(directive: unknown): directive is T => {
  return typeof directive === 'object' && directive !== null
}

export const fetchDirective = <T extends Record<string, unknown>>(schema: GraphQLSchema, fieldConfig: DirectableGraphQLObject, directiveName: string): T => {
  const directive = getDirective(schema, fieldConfig, directiveName)?.[0]
  const isValid = isValidDirective<T>(directive)
  if (isValid) {
    return directive
  }
  return null
}

export const generateGraphQLEnum = (enumName: string, origin: Record<string, string>) => {
  const formattedValues = Object.keys(origin).map((key) => {
    return `${key} \n`
  }).join('')
  const result = `enum ${enumName} {\n${formattedValues} }`
  return result
}
