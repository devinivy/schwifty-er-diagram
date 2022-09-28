'use strict';

const internals = {};

exports.plugin = {
    pkg: require('../package.json'),
    register(server) {

        server.expose('commands', {
            default: {
                noDefaultOutput: true,
                command(srv) {

                    const relationships = internals.relationships(srv.models(true));
                    const uniqueRelationships = relationships.filter(({ from, to, type }) => {

                        if (type === 'many-to-many' || type === 'one-to-one') {
                            return !relationships.some((rel) => {

                                return from === rel.to && to === rel.from && rel.type === type;
                            });
                        }

                        if (type === 'many-to-one') {
                            return !relationships.some((rel) => {

                                return from === rel.to && to === rel.from && rel.type === 'one-to-many';
                            });
                        }

                        return true;
                    });

                    const mermaidDiagram = 'erDiagram\n' +
                        uniqueRelationships
                            .sort((x, y) => {

                                return x.from.localeCompare(y.from) || x.to.localeCompare(y.to);
                            })
                            .map(internals.relationshipToMermaid)
                            .map((x) => `  ${x}`)   // Indent
                            .join('\n');

                    console.log(mermaidDiagram);
                }
            }
        });
    }
};

internals.relationships = (models) => {

    return Object.values(models)
        .flatMap((Model) => {

            return Object.values(Model.getRelations()).map((relation) => {

                const relationToType = {
                    BelongsToOneRelation: 'many-to-one',
                    HasOneRelation: 'one-to-one',
                    HasManyRelation: 'one-to-many',
                    ManyToManyRelation: 'many-to-many',
                    HasOneThroughRelation: 'many-to-one'
                };

                return {
                    name: relation.name,
                    type: relationToType[relation.constructor.name],
                    from: relation.ownerModelClass.name, // TODO schwifty get name
                    to: relation.relatedModelClass.name  // TODO schwifty get name
                };
            });
        });
};

internals.relationshipToMermaid = ({ from, to, type, name }) => {

    const typeToMermaid = {
        'many-to-many': '}o--o{',
        'one-to-one': '|o--o|',
        'many-to-one': '}o--o|',
        'one-to-many': '|o--o{'
    };

    // E.g. 'someCamelCase' -> 'some camel case'
    const camelToWords = (cc) => cc.replace(/[a-z][A-Z]/g, (x) => x.split('').join(' ').toLowerCase());

    return `${from} ${typeToMermaid[type]} ${to} : "${camelToWords(name)}"`;
};
