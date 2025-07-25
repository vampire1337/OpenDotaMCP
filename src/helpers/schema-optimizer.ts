import { buildClientSchema, GraphQLSchema, GraphQLField, GraphQLType, isObjectType, isInterfaceType, isUnionType, getNamedType, isNonNullType, isListType } from "graphql";

interface SchemaField {
  name: string;
  typeName: string;
  parentType: string;
  description?: string;
  depth: number;
  path: string;
}

interface SearchResult {
  field: SchemaField;
  relevance: number;
}

export class SchemaOptimizer {
  private schema: GraphQLSchema | null = null;
  private fieldIndex: Map<string, SchemaField[]> = new Map();
  private typeCache: Map<string, string> = new Map();

  async indexSchema(schemaData: any): Promise<void> {
    try {
      console.log('🔄 Starting schema indexing...');
      console.log('📊 Raw schema data keys:', Object.keys(schemaData || {}));
      console.log('📊 Schema data __schema exists:', !!schemaData?.__schema);
      
      if (schemaData?.__schema?.types) {
        const typeNames = schemaData.__schema.types.map((t: any) => t.name).slice(0, 10);
        console.log('📋 First 10 types in schema:', typeNames);
        
        const rootTypes = schemaData.__schema.types.filter((t: any) => 
          ['Query', 'Mutation', 'Subscription'].includes(t.name)
        );
        console.log('📋 Found root types:', rootTypes.map((t: any) => t.name));
      }
      
      this.schema = buildClientSchema(schemaData);
      this.fieldIndex.clear();
      this.typeCache.clear();

      console.log('🔍 Built schema queryType:', !!this.schema.getQueryType());
      console.log('🔍 Built schema mutationType:', !!this.schema.getMutationType());
      console.log('🔍 Built schema subscriptionType:', !!this.schema.getSubscriptionType());

      let indexedFieldsCount = 0;
      
      // Use proper GraphQL schema methods instead of getType()
      const rootTypeMapping = [
        { name: 'Query', type: this.schema.getQueryType() },
        { name: 'Mutation', type: this.schema.getMutationType() },
        { name: 'Subscription', type: this.schema.getSubscriptionType() }
      ];
      
      for (const { name: rootTypeName, type: rootType } of rootTypeMapping) {
        console.log(`🔍 Looking for ${rootTypeName} type... Found: ${rootType ? 'YES' : 'NO'}`);
        
        if (rootType) {
          console.log(`  Type details: ${rootType.constructor.name}, isObjectType: ${isObjectType(rootType)}`);
          
          if (isObjectType(rootType)) {
            console.log(`📋 Indexing ${rootTypeName} type...`);
            const fieldsCount = this.indexType(rootType, rootTypeName, 0, rootTypeName);
            indexedFieldsCount += fieldsCount;
            console.log(`  ➤ Indexed ${fieldsCount} fields for ${rootTypeName}`);
          } else {
            console.log(`  ⚠️ ${rootTypeName} is not an ObjectType`);
          }
        }
      }

      console.log(`✅ Schema indexing complete:`);
      console.log(`  ➤ Total fields: ${indexedFieldsCount}`);
      console.log(`  ➤ Search keywords: ${this.fieldIndex.size}`);
      console.log(`  ➤ Sample keywords: ${Array.from(this.fieldIndex.keys()).slice(0, 10).join(', ')}`);
      
      if (this.fieldIndex.size === 0) {
        throw new Error('Schema indexing produced empty index - no fields found');
      }
    } catch (error) {
      console.error('❌ Schema indexing failed:', error);
      throw error;
    }
  }

  private indexType(type: any, typeName: string, depth: number, path: string, visited = new Set<string>()): number {
    if (visited.has(typeName) || depth > 3) {
      console.log(`  ⏭️ Skipping ${typeName} (visited: ${visited.has(typeName)}, depth: ${depth})`);
      return 0;
    }
    visited.add(typeName);

    let indexedCount = 0;
    console.log(`  🔍 Processing type: ${typeName} (${type?.constructor?.name})`);

    if (isObjectType(type) || isInterfaceType(type)) {
      const fields = type.getFields();
      console.log(`    📋 Found ${Object.keys(fields).length} fields in ${typeName}`);
      
      Object.entries(fields).forEach(([fieldName, field]: [string, GraphQLField<any, any>]) => {
        const fieldType = getNamedType(field.type);
        const schemaField: SchemaField = {
          name: fieldName,
          typeName: fieldType.name,
          parentType: typeName,
          description: field.description,
          depth,
          path: `${path}.${fieldName}`
        };

        // Index by field name
        const nameKey = fieldName.toLowerCase();
        if (!this.fieldIndex.has(nameKey)) {
          this.fieldIndex.set(nameKey, []);
        }
        this.fieldIndex.get(nameKey)!.push(schemaField);
        indexedCount++;

        // Index by type name parts (e.g., "player" from "PlayerType")
        const typeWords = fieldType.name.toLowerCase().replace(/type$/, '').split(/(?=[A-Z])/);
        typeWords.forEach(word => {
          if (word.length > 2) {
            const wordKey = word.toLowerCase();
            if (!this.fieldIndex.has(wordKey)) {
              this.fieldIndex.set(wordKey, []);
            }
            this.fieldIndex.get(wordKey)!.push(schemaField);
          }
        });

        // Index by description keywords
        if (field.description) {
          const keywords = field.description.toLowerCase().split(/\s+/);
          keywords.forEach(keyword => {
            if (keyword.length > 2) {
              if (!this.fieldIndex.has(keyword)) {
                this.fieldIndex.set(keyword, []);
              }
              this.fieldIndex.get(keyword)!.push(schemaField);
            }
          });
        }

        // Recursively index nested types
        if (isObjectType(fieldType) || isInterfaceType(fieldType)) {
          indexedCount += this.indexType(fieldType, fieldType.name, depth + 1, schemaField.path, new Set(visited));
        }
      });
    }

    return indexedCount;
  }

  searchFields(keywords: string[], maxResults = 10): SearchResult[] {
    console.log(`🔍 Searching for keywords: ${keywords.join(', ')}`);
    console.log(`📊 Index has ${this.fieldIndex.size} keys`);
    
    if (this.fieldIndex.size === 0) {
      console.warn('⚠️ Schema index is empty - schema not initialized?');
      return [];
    }

    const results = new Map<string, SearchResult>();
    
    keywords.forEach(keyword => {
      const normalizedKeyword = keyword.toLowerCase();
      const directFields = this.fieldIndex.get(normalizedKeyword) || [];
      
      console.log(`🎯 Direct matches for "${keyword}": ${directFields.length}`);
      
      directFields.forEach(field => {
        const key = field.path;
        const relevance = this.calculateRelevance(field, keyword);
        
        if (!results.has(key) || results.get(key)!.relevance < relevance) {
          results.set(key, { field, relevance });
        }
      });

      // Fuzzy search
      let fuzzyMatches = 0;
      this.fieldIndex.forEach((fields, indexKey) => {
        if (indexKey.includes(normalizedKeyword) || normalizedKeyword.includes(indexKey)) {
          fuzzyMatches += fields.length;
          fields.forEach(field => {
            const key = field.path;
            const relevance = this.calculateRelevance(field, keyword) * 0.7;
            
            if (!results.has(key) || results.get(key)!.relevance < relevance) {
              results.set(key, { field, relevance });
            }
          });
        }
      });
      
      console.log(`🔎 Fuzzy matches for "${keyword}": ${fuzzyMatches}`);
    });

    const sortedResults = Array.from(results.values())
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxResults);

    console.log(`✅ Total results found: ${sortedResults.length}`);
    
    return sortedResults;
  }

  private calculateRelevance(field: SchemaField, keyword: string): number {
    let score = 0;
    const normalizedKeyword = keyword.toLowerCase();
    
    // Exact field name match
    if (field.name.toLowerCase() === normalizedKeyword) score += 10;
    else if (field.name.toLowerCase().includes(normalizedKeyword)) score += 5;
    
    // Description match
    if (field.description?.toLowerCase().includes(normalizedKeyword)) score += 3;
    
    // Depth penalty (prefer shallow fields)
    score -= field.depth * 0.5;
    
    return score;
  }

  getTypeDefinition(typeName: string, maxDepth = 2): string {
    const cacheKey = `${typeName}_${maxDepth}`;
    if (this.typeCache.has(cacheKey)) {
      return this.typeCache.get(cacheKey)!;
    }

    if (!this.schema) throw new Error('Schema not initialized');
    
    const type = this.schema.getType(typeName);
    if (!type) throw new Error(`Type ${typeName} not found`);

    const definition = this.buildTypeDefinition(type, maxDepth, new Set());
    this.typeCache.set(cacheKey, definition);
    
    return definition;
  }

  private buildTypeDefinition(type: GraphQLType, maxDepth: number, visited: Set<string>, currentDepth = 0): string {
    const namedType = getNamedType(type);
    
    if (visited.has(namedType.name) || currentDepth >= maxDepth) {
      return namedType.name;
    }
    
    visited.add(namedType.name);

    if (isObjectType(namedType) || isInterfaceType(namedType)) {
      const fields = namedType.getFields();
      const fieldDefs = Object.entries(fields)
        .slice(0, 10) // Limit fields to prevent explosion
        .map(([fieldName, field]) => {
          const fieldType = this.getTypeString(field.type, maxDepth, visited, currentDepth + 1);
          return `  ${fieldName}: ${fieldType}`;
        })
        .join('\n');

      return `type ${namedType.name} {\n${fieldDefs}\n}`;
    }

    return namedType.name;
  }

  private getTypeString(type: GraphQLType, maxDepth: number, visited: Set<string>, currentDepth: number): string {
    if (isNonNullType(type)) {
      return `${this.getTypeString(type.ofType, maxDepth, visited, currentDepth)}!`;
    }
    
    if (isListType(type)) {
      return `[${this.getTypeString(type.ofType, maxDepth, visited, currentDepth)}]`;
    }

    const namedType = getNamedType(type);
    return currentDepth >= maxDepth ? namedType.name : namedType.name;
  }

  generateQueryTemplate(fields: SchemaField[]): string {
    const queryFields = fields
      .filter(f => f.parentType === 'Query')
      .slice(0, 5)
      .map(f => {
        if (['String', 'Int', 'Float', 'Boolean', 'ID'].includes(f.typeName)) {
          return f.name;
        }
        return `${f.name} { # ${f.typeName} - add specific fields }`;
      })
      .join('\n  ');

    return `query {\n  ${queryFields}\n}`;
  }

  getIndexSize(): number {
    return this.fieldIndex.size;
  }

  getSchemaStatus(): { initialized: boolean; indexSize: number; hasCachedTypes: number } {
    return {
      initialized: this.schema !== null,
      indexSize: this.fieldIndex.size,
      hasCachedTypes: this.typeCache.size
    };
  }
}