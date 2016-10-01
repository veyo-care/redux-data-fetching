import {fromJS, Map, List} from 'immutable';

function getStateResourceKeyOf(state, payloadResourceKey) {
  return payloadResourceKey.reduce((reduction, key, index) => {
    let resource = state.getIn(reduction);
    if (resource === undefined)
      return fromJS([]);
    else if (List.isList(resource.get(key))) {
      if (payloadResourceKey.has(index + 2) && payloadResourceKey.get(index + 1) == "id")
        return reduction.push(resource.get(key).findIndex(value => value.get(id) == payloadResourceKey.get(index + 2)));
      else
        return reduction.push(key);
    } else if (key == "id" || payloadResourceKey.get(index - 1) == "id") {
      return reduction;
    } else {
      return reduction.push(key);
    }
  }, fromJS([])).toJS();
}

function recursiveReduce(payload, state, payloadResourceKey) {
  let resource = payload.getIn(payloadResourceKey);
  if (Map.isMap(resource)) {
    return resource.keySeq().reduce((red, key) => recursiveReduce(payload, red, payloadResourceKey.push(key)), state);
  } else if (List.isList(resource)){
    return resource.keySeq().reduce((red, index) => recursiveReduce(payload, red, payloadResourceKey.push(index)), state);
  } else if (payloadResourceKey.last() == "id") {
    let stateResourceKey = getStateResourceKeyOf(state, payloadResourceKey.push(resource));
    if (stateResourceKey.length == 0)
      return state;
    else
      return state.removeIn(stateResourceKey);
  } else {
    let stateResourceKey = getStateResourceKeyOf(state, payloadResourceKey);
    if (stateResourceKey.length == 0)
      return state;
    else
      return state.removeIn(stateResourceKey);
  }
}

export default function(state = {}, action) {
  switch(action.type) {
    case "GRAPHQL_DATA_RECEIVED":
      return fromJS(action.payload)
              .keySeq()
              .reduce(
                (reduction, resourceKey) => reduction.update(
                  resourceKey,
                  resources => {
                    let newResources = fromJS(action.payload[resourceKey]);
                    if (typeof action.payload[resourceKey] === "object" && Array.isArray(action.payload[resourceKey])) {
                      resources = resources || fromJS([]);
                      return resources
                              .map(
                                resource => resource.mergeDeep(
                                              newResources
                                                .find(newResource => newResource.get('id') == resource.get('id'), {}, fromJS({}))
                                            )
                              )
                              .concat(newResources.filterNot(newResource => resources.find(existingResource => existingResource.get('id') == newResource.get('id'))))
                    } else if (typeof action.payload[resourceKey] === "object") {
                      resources = resources || fromJS({});
                      return resources.mergeDeep(newResources);
                    }
                  }
                ),
                fromJS(state)
              )
              .toJS();
      break;
    case "GRAPHQL_DATA_REMOVED":
      return recursiveReduce(fromJS(action.payload), fromJS(state), fromJS([])).toJS();
      break;
    default:
      return state;
  }
};