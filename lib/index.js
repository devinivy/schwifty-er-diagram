'use strict';

const Bossy = require('@hapi/bossy');

const internals = {};

exports.plugin = {
    pkg: require('../package.json'),
    register(server) {

        server.expose('commands', {
            default: {
                noDefaultOutput: true,
                command(srv, argv, _, { DisplayError }) {

                    const args = Bossy.parse(internals.cliDefinition, { argv });

                    if (args instanceof Error) {
                        throw DisplayError(args.message);
                    }

                    if (args.help) {
                        console.log(Bossy.usage(internals.cliDefinition, 'hpal run schwifty-er-diagram'));
                        return;
                    }

                    const plugin = args.plugin;
                    const allowModels = args.model && args.model.flatMap((x) => x.split(','));
                    const disallowModels = args['no-model'] && args['no-model'].flatMap((x) => x.split(','));

                    const models = srv.models(plugin ?? true);
                    const relationships = internals.relationships(models);
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
                            .filter(({ from, to }) => {

                                return (
                                    (!allowModels || (allowModels.includes(from) || allowModels.includes(to))) &&
                                    (!disallowModels || (!disallowModels.includes(from) && !disallowModels.includes(to)))
                                );
                            })
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
                    from: relation.ownerModelClass.name,
                    to: relation.relatedModelClass.name
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

internals.cliDefinition = {
    help: {
        alias: 'h',
        description: 'Show help',
        type: 'boolean'
    },
    plugin: {
        alias: 'p',
        description: 'Only include models from this plugin',
        type: 'string'
    },
    model: {
        alias: 'm',
        description: 'Allow list of models',
        type: 'string',
        multiple: true
    },
    'no-model': {
        alias: 'M',
        description: 'Disallow list of models',
        type: 'string',
        multiple: true
    }
};
