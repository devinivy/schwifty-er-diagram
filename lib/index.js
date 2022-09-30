'use strict';

const Zlib = require('zlib');
const Bossy = require('@hapi/bossy');

const internals = {};

exports.plugin = {
    pkg: require('../package.json'),
    once: true,
    register(server) {

        server.expose('commands', {
            default: {
                noDefaultOutput: true,
                command(srv, argv, _, { DisplayError }) {

                    const args = Bossy.parse(internals.cliDefinition, { argv });

                    if (args instanceof Error) {
                        throw new DisplayError(args.message);
                    }

                    if (args.help) {
                        console.log(Bossy.usage(internals.cliDefinition, 'hpal run schwifty-er-diagram'));
                        return;
                    }

                    const plugin = args.plugin;
                    const allowModels = args.model && args.model.flatMap((x) => x.split(','));
                    const disallowModels = args['no-model'] && args['no-model'].flatMap((x) => x.split(','));
                    const betweenModels = args.between && args.between.split('..');

                    const models = srv.models(plugin ?? true);
                    const relationships = internals.relationships(models);
                    const uniqueRelationships = relationships.filter(({ from, to, type }) => {
                        // Ignore other side of relation pairs

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
                                // Filter out some relationships based on CLI options
                                return (
                                    (!betweenModels || (betweenModels.includes(from) && betweenModels.includes(to))) &&
                                    (!allowModels || (allowModels.includes(from) || allowModels.includes(to))) &&
                                    (!disallowModels || (!disallowModels.includes(from) && !disallowModels.includes(to)))
                                );
                            })
                            .sort((x, y) => {
                                // Sort relationships alphabetically by model name
                                return x.from.localeCompare(y.from) || x.to.localeCompare(y.to);
                            })
                            .map(internals.relationshipToMermaid)
                            .map((x) => `  ${x}`)   // Indent
                            .join('\n');

                    if (args.link) {
                        return console.log(`https://mermaid.live/edit#${internals.mermaidToPako(mermaidDiagram)}`);
                    }

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

internals.mermaidToPako = (code) => {

    const encoded = Zlib.deflateSync(
        JSON.stringify({
            code,
            mermaid: '{}'
        })
    ).toString('base64url');

    return `pako:${encoded}`;
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
    },
    between: {
        alias: 'b',
        description: 'Only look at relations between two models (ModelA..ModelB)',
        type: 'string'
    },
    link: {
        alias: 'l',
        description: 'Output a link to mermaid.live rather than markup',
        type: 'boolean'
    }
};
