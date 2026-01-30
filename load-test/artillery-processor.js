// Artillery processor for custom functions
export function beforeScenario(context, events, done) {
    context.vars.timestamp = Date.now();
    return done();
}

export function afterResponse(context, events, done) {
    // Custom logic after response
    return done();
}
