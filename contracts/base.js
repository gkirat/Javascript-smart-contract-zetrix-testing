'use strict';

const stakeKey = 'all_stake';
const configKey = 'dpos_config';
const valCandsKey = 'validator_candidates';
const kolCandsKey = 'kol_candidates';
const valRewardKey = 'validator_reward_distribution';
const kolRewardKey = 'kol_reward_distribution';
const committeeKey = 'committee';
const rotateKey = 'validator_rotate';
const freezeKey = 'validator_freeze';

const role = {
  'COMMITTEE': 'committee',
  'VALIDATOR': 'validator',
  'KOL': 'kol'   //What is kol, what does it mean
};

const motion = {
  'APPLY': 'apply',
  'ABOLISH': 'abolish',
  'WITHDRAW': 'withdraw',
  'CONFIG': 'config'
};

let elect = {};
let cfg = {};
let feeCfg = {
  'gas_price': 1,
  'base_reserve': 2
};
let distributed = false;

function doubleSort(a, b) {
  let com = Utils.int64Compare(b[1], a[1]);

  if (com === 0) {
    return a[0] > b[0] ? 1 : -1;
  }

  return com;
}

function loadObj(key) {
  let data = Chain.load(key);
  if (data !== false) {
    return JSON.parse(data);
  }

  return false;
}

function saveObj(key, value) {
  let str = JSON.stringify(value);
  Chain.store(key, str);
}

function minusStake(amount) {
  elect.allStake = Utils.int64Sub(elect.allStake, amount);
  Chain.store(stakeKey, elect.allStake);
}

function transferCoin(dest, amount, input, remark) {
  if (amount === '0') {
    return true;
  }

  minusStake(amount);
  Chain.payCoin(dest, amount, input, remark);
}

function validatorsList() {

    // What are the below require statement checking -------------------->

  Utils.assert(cfg !== false, 'Failed to get ' + configKey + ' from metadata.');  //this is require statement

  let valCands = loadObj(valCandsKey);
  Utils.assert(valCands !== false, 'Failed to get ' + valCandsKey + ' from metadata.');  

  //return valCands.slice(0, cfg.validator_size);

  let validators = Chain.getValidators();
  Utils.assert(validators !== false, 'Failed to get validators.');
  let ret = [];
  let i;
  let j;
  for (i = 0; i < validators.length; i += 1) {
    for (j = 0; j < valCands.length; j += 1) {
      if (validators[i][0] === valCands[j][2]) {
        ret.push(valCands[j]);
        break;
      }
    }
  }
  return ret;
}

function getValidatorNodeList() {
  let validators = Chain.getValidators();
  Utils.assert(validators !== false, 'Failed to get validators.');
  let validatorsNodeList = [];
  let i = 0;
  for (i = 0; i < validators.length; i += 1) {
    validatorsNodeList.push(validators[i][0]);
  }
  return validatorsNodeList;
}

function electInit() {
  elect.kolDist = loadObj(kolRewardKey);
  Utils.assert(elect.kolDist !== false, 'Failed to get ' + kolRewardKey + ' from metadata.');

  elect.valDist = loadObj(valRewardKey);
  Utils.assert(elect.valDist !== false, 'Failed to get ' + valRewardKey + ' from metadata.');

  elect.balance = Chain.getBalance(Chain.thisAddress);
  Utils.assert(elect.balance !== false, 'Failed to get account balance.');

  elect.valCands = loadObj(valCandsKey);
  Utils.assert(elect.valCands !== false, 'Failed to get ' + elect.valCands + ' from metadata.');

  elect.kolCands = loadObj(kolCandsKey);
  Utils.assert(elect.kolCands !== false, 'Failed to get ' + kolCandsKey + ' from metadata.');

  // elect.validators = elect.valCands.slice(0, cfg.validator_size);
  elect.validators = validatorsList();
  elect.kols = elect.kolCands.slice(0, cfg.kol_size);
}

function distribute(nodes, allReward, dist) {
  if (nodes.length === 0) {
    return false;
  }

  let i = 0;
  let reward = Utils.int64Div(allReward, nodes.length);
  for (i = 0; i < nodes.length; i += 1) {
    let name = nodes[i][0];
    dist[name][0] = Utils.int64Add(dist[name][0], reward);
  }

  let left = Utils.int64Mod(allReward, nodes.length);
  // let topOne = dist[nodes[0][0]];
  // topOne[0]  = Utils.int64Add(topOne[0], left);
  let index = Utils.int64Mod(Chain.block.number, nodes.length);
  let one = dist[nodes[index][0]];
  one[0] = Utils.int64Add(one[0], left);

  return true;
}

function getOnlineNodeList() {
  if (cfg.monitor_contract.length === 0) {
    return [];
  }
  let queryInput = {
    'method': 'getNodeList',
    'params': {
      'rate': cfg.monitor_rate
    }
  };
  let callInput = {
    'method': 'clearRecord'
  };

  let ret = Chain.contractQuery(cfg.monitor_contract, JSON.stringify(queryInput));
  Chain.payCoin(cfg.monitor_contract, '0', JSON.stringify(callInput));
  return JSON.parse(ret.result);
}

function calculate(reward) {
  let centi = Utils.int64Div(reward, 100);
  let rVF = Utils.int64Mul(centi, cfg.reward_allocation_share[0]);
  let rVC = Utils.int64Mul(centi, cfg.reward_allocation_share[1]);
  let rKF = Utils.int64Mul(centi, cfg.reward_allocation_share[2]);
  let rKC = Utils.int64Mul(centi, cfg.reward_allocation_share[3]);

  // let kolCands = elect.kolCands.slice(cfg.kol_size);
  // let valCands = elect.valCands.slice(cfg.validator_size);

  // rKF = distribute(kolCands, rKC, elect.kolDist) ? rKF : Utils.int64Add(rKF, rKC);
  // rVF = distribute(elect.kols, rKF, elect.kolDist) ? rVF : Utils.int64Add(rVF, rKF);
  // rVF = distribute(valCands, rVC, elect.valDist) ? rVF : Utils.int64Add(rVF, rVC);
  // distribute(elect.validators, rVF, elect.valDist);
  let nodeList = getOnlineNodeList();
  if (nodeList.length === 0) {
    distribute(elect.valCands, rVF, elect.valDist);
  } else {
    let cans = [];
    let i;
    let nodeListObj = {};
    for (i = 0; i < nodeList.length; i += 1) {
      nodeListObj[nodeList[i]] = 0;
    }
    for (i = 0; i < elect.valCands.length; i += 1) {
      if (nodeListObj[elect.valCands[i][2]] !== undefined) {
        cans.push(elect.valCands[i]);
      }
    }
    if (cans.length > 0) {
      distribute(cans, rVF, elect.valDist);
    } else {
      distribute(elect.valCands, rVF, elect.valDist);
    }
  }

  let left = Utils.int64Mod(reward, 100);
  // let topOne = elect.valDist[elect.validators[0][0]];
  // topOne[0] = Utils.int64Add(topOne[0], left);
  let index = Utils.int64Mod(Chain.block.number, elect.valCands.length);
  let one = elect.valDist[elect.valCands[index][0]];
  one[0] = Utils.int64Add(one[0], left);
}

function rewardDistribution() {
  let reward = Utils.int64Sub(elect.balance, elect.allStake);
  if (reward === '0') {
    return;
  }

  calculate(reward);
  distributed = true;

  elect.allStake = elect.balance;
  saveObj(stakeKey, elect.allStake);
}

function rewardInput() {
  return JSON.stringify({
    'method': 'reward'
  });
}

/* dist[address]
 * [0] : reward received
 * [1] : vote reward pool
 * [2] : vote reward ratio */
function award(candidates, dist, address) {
  if (dist[address] === '0') {
    return;
  }

  if (dist[address][2] === 0) {
    transferCoin(address, dist[address][0], rewardInput(), address + '_nodeReward');
  } else if (dist[address][2] === 100) {
    transferCoin(dist[address][1], dist[address][0], rewardInput(), address + '_votingReward');
  } else {
    let onePercent = Utils.int64Div(dist[address][0], 100);
    let dividend = Utils.int64Mul(onePercent, dist[address][2]);
    transferCoin(dist[address][1], dividend, rewardInput(), address + '_votingReward');

    let reserve = Utils.int64Sub(dist[address][0], dividend);
    transferCoin(address, reserve, rewardInput(), address + '_nodeReward');
  }

  dist[address][0] = '0';
  distributed = true;

  if (candidates.find(function(x) {
    return x[0] === address;
  }) === undefined) {
    delete dist[address];
  }
}

function extractTransfer(list) {
  Utils.assert(typeof list === 'object', 'Wrong parameter type.');
  Utils.assert(list.length <= 100, 'The award-receiving addresses:' + list.length + ' exceed upper limit:100.');

  electInit();
  let i = 0;
  for (i = 0; i < list.length; i += 1) {
    if (elect.valDist[list[i]] !== undefined) {
      award(elect.valCands, elect.valDist, list[i]);
    }

    if (elect.kolDist[list[i]] !== undefined) {
      award(elect.kolCands, elect.kolDist, list[i]);
    }
  }
}

function extract() {
  Utils.assert(cfg.validator_freeze_account.includes(Chain.msg.sender) === true, 'Sender is not validator_freeze_account.');
  electInit();
  rewardDistribution();
}

function nodeAddressValid(node) {
  Utils.assert(Utils.addressCheck(node), 'Invalid address:' + node + '.');

  let candidates = loadObj(valCandsKey);
  Utils.assert(candidates !== false, 'Failed to get ' + valCandsKey + ' from metadata.');

  let found = candidates.find(function(x) {
    return x[2] === node;
  });
  Utils.assert(found === undefined, node + ' has already been applied.');
}

function proposalKey(operate, content, address) {
  return operate + '_' + content + '_' + address;
}

function applicationProposal(roleType, pool, ratio, node) {
  let proposal = {
    'pledge': Chain.msg.coinAmount,
    'expiration': Chain.block.timestamp + cfg.valid_period,
    'ballot': []
  };

  if (roleType === role.COMMITTEE) {
    return proposal;
  }

  Utils.assert(Utils.addressCheck(pool), 'Invalid address:' + pool + '.');
  Utils.assert(Number.isInteger(ratio) && 0 <= ratio && ratio <= 100, 'Invalid vote reward ratio:' + ratio + '.');

  proposal.rewardPool = pool;
  proposal.rewardRatio = ratio;
  if (roleType === role.KOL) {
    return proposal;
  }

  nodeAddressValid(node);
  proposal.node = node;
  return proposal;
}

function checkPledge(roleType) {
  let com = -1;

  if (roleType === role.VALIDATOR) {
    com = Utils.int64Compare(Chain.msg.coinAmount, cfg.validator_min_pledge);
    Utils.assert(com >= 0, 'The pledge:' + Chain.msg.coinAmount + ' is less than the minimum requirement:' + cfg.validator_min_pledge + ' of the validator.');
  } else if (roleType === role.KOL) {
    com = Utils.int64Compare(Chain.msg.coinAmount, cfg.kol_min_pledge);
    Utils.assert(com >= 0, 'The pledge:' + Chain.msg.coinAmount + ' is less than the minimum requirement:' + cfg.kol_min_pledge + ' of the KOL.');
  } else if (roleType === role.COMMITTEE) {
    Utils.assert(Chain.msg.coinAmount === '0', 'No pledge is required to apply to join the committee.');
  } else {
    throw 'Unkown role:' + roleType + '.';
  }
}

function getValidatorCandidatesNodeList() {
  let candidates = loadObj(valCandsKey);
  let candidateNodeList = [];
  let i = 0;
  for (i = 0; i < candidates.length; i += 1) {
    candidateNodeList.push(candidates[i][2]);
  }
  return candidateNodeList;
}

function getRandomElement(seed, elemList, pickSize) {
  let pick = [];
  let i = 0;
  while (pickSize > 0) {
    i += Chain.block.timestamp;
    let elem = elemList[Utils.int64Mod(Utils.int64Add(seed + pickSize, i), elemList.length)];
    if (pick.includes(elem) === false) {
      pick.push(elem);
      pickSize -= 1;
    }
  }
  return pick;
}

// There are three situations that trigger passive rotation
// 1.delete candidate while the candidate is validator, (false, nodeAddress)
// 2.update node address while the node is validator, (false, nodeAddress)
// 3.validator setFreeze, (true, undefined)
//
// call method, (false, undefined)
function updateValidators(isSetFreeze, nodeAddress) {
  let i;

  let validatorsOldList = getValidatorNodeList();
  validatorsOldList.sort();

  if (nodeAddress !== undefined && validatorsOldList.includes(nodeAddress) === false) {
    return;
  }

  Utils.assert(cfg.validator_rand_seed !== undefined, 'validator_rand_seed is not initialized.');
  Utils.assert(cfg.validator_rotate_node_count !== undefined, 'validator_rotate_node_count is not initialized.');
  Utils.assert(cfg.validator_slice_block_count !== undefined, 'validator_slice_block_count is not initialized.');

  let rotateInfo = loadObj(rotateKey);
  if (rotateInfo === false) {
    rotateInfo = {
      'lastSeq': '0'
    };
  }
  // call contract with updateValidator method need check block number
  if (nodeAddress === undefined && isSetFreeze === false) {
    let allowBlock = Utils.int64Add(rotateInfo.lastSeq, cfg.validator_slice_block_count);
    Utils.assert(Utils.int64Compare(Chain.block.number, allowBlock) !== -1, 'The next rotation should be at block height ' + allowBlock + '.');
  }
  rotateInfo.lastSeq = Chain.block.number;

  let freezeList = loadObj(freezeKey);
  if (freezeList === false) {
    freezeList = [];
  }
  // check freeze list
  if (nodeAddress !== undefined) {
    let indexFreeze = freezeList.indexOf(nodeAddress);
    if (indexFreeze !== -1) {
      freezeList.splice(indexFreeze, 1);
      saveObj(freezeKey, freezeList);
    }
  }

  let candidateNodeListAll = getValidatorCandidatesNodeList();

  let validatorsOldListValid = [];
  for (i = 0; i < validatorsOldList.length; i += 1) {
    // not in freeze list and in candidate list
    if (freezeList.includes(validatorsOldList[i]) === false && candidateNodeListAll.includes(validatorsOldList[i]) === true) {
      validatorsOldListValid.push(validatorsOldList[i]);
    }
  }
  validatorsOldListValid.sort();

  let candidateNodeList = [];
  for (i = 0; i < candidateNodeListAll.length; i += 1) {
    if (validatorsOldList.includes(candidateNodeListAll[i]) === false) {
      if (freezeList.includes(candidateNodeListAll[i]) === false) {
        candidateNodeList.push(candidateNodeListAll[i]);
      }
    }
  }
  candidateNodeList.sort();
  // Chain.tlog('ValidatorsAndCandidates', JSON.stringify(validatorsOldListValid), JSON.stringify(candidateNodeList));

  let validatorsNew = validatorsOldListValid;

  let canList = [];
  let valList = [];
  // Attrition of validators
  if (validatorsOldListValid.length > cfg.validator_size) {
    let attritionCount = validatorsOldListValid.length - cfg.validator_size;
    valList = getRandomElement(cfg.validator_rand_seed + Chain.block.number, validatorsOldListValid, attritionCount);
  } else if (candidateNodeList.length > 0) {
    if (validatorsOldListValid.length + candidateNodeList.length <= cfg.validator_size) {
      canList = candidateNodeList;
    } else {
      // valSize + canSize > cfgSize
      // canSize > cfgSize - valSize > validatorAdd
      let validatorAdd = cfg.validator_size - validatorsOldListValid.length;
      let validatorSwap = 0;
      // min(cfgRotateNodeSize, valSize, canSize)
      if (validatorAdd === 0) {
        validatorSwap = candidateNodeList.length;
        if (validatorSwap > cfg.validator_rotate_node_count) {
          validatorSwap = cfg.validator_rotate_node_count;
        }
        if (validatorSwap > validatorsOldListValid.length) {
          validatorSwap = validatorsOldListValid.length;
        }
      }

      // pick add
      if (validatorAdd > 0) {
        canList = getRandomElement(cfg.validator_rand_seed + Chain.block.number, candidateNodeList, validatorAdd);
      }

      // pick swap
      if (validatorSwap > 0) {
        valList = getRandomElement(cfg.validator_rand_seed + Chain.block.number, validatorsOldListValid, validatorSwap);
        canList = getRandomElement(cfg.validator_rand_seed + Chain.block.number, candidateNodeList, validatorSwap);
      }
    }
  }

  // Chain.tlog('RemoveAndAdd', JSON.stringify(valList),JSON.stringify(canList));
  for (i = 0; i < valList.length; i += 1) {
    let index = validatorsOldListValid.indexOf(valList[i]);
    if (index !== -1) {
      validatorsOldListValid.splice(index, 1);
    }
  }
  if (canList.length > 0) {
    validatorsNew = validatorsOldListValid.concat(canList);
  } else {
    validatorsNew = validatorsOldListValid;
  }

  validatorsNew.sort();
  Utils.assert(validatorsNew.length >= 1, 'No rotating validators.');
  if (JSON.stringify(validatorsNew) !== JSON.stringify(validatorsOldList)) {
    // Chain.tlog('NewValidators', JSON.stringify(validatorsNew));
    let newList = [];
    for (i = 0; i < validatorsNew.length; i += 1) {
      newList.push([validatorsNew[i], "0"]);
    }
    Chain.setValidators(JSON.stringify(newList));
  }
  saveObj(rotateKey, rotateInfo);
}

function setFreeze(validators, freeze) {
  Utils.assert(freeze === true || freeze === false, 'Wrong parameter.');
  Utils.assert(typeof validators === 'object', 'Wrong parameter.');
  Utils.assert(validators.length <= 100, 'Wrong parameter.');

  let freezeList = loadObj(freezeKey);
  if (freezeList === false) {
    freezeList = [];
  }
  let i;
  let rotate = false;
  let candidateNodeList = getValidatorCandidatesNodeList();
  let validatorNodeList = getValidatorNodeList();
  for (i = 0; i < validators.length; i += 1) {
    Utils.assert(Utils.addressCheck(validators[i]), 'Invalid address:' + validators[i] + '.');
    Utils.assert(candidateNodeList.includes(validators[i]) === true, 'Invalid validator address:' + validators[i] + '.');
    if (freeze === true) {
      if (freezeList.includes(validators[i]) === false) {
        if (validatorNodeList.includes(validators[i]) === true) {
          rotate = true;
        }
        freezeList.push(validators[i]);
      }
    } else {
      let index = freezeList.indexOf(validators[i]);
      if (index !== -1) {
        freezeList.splice(index, 1);
      }
    }
  }
  freezeList.sort();
  saveObj(freezeKey, freezeList);
  if (rotate === true) {
    updateValidators(true);
  }
}
function addCandidates(roleType, address, proposal, maxSize) {
  let candidates = roleType === role.VALIDATOR ? elect.valCands: elect.kolCands;
  let stake = Utils.int64Mul(proposal.pledge, cfg.pledge_magnification);
  let com = -1;

  if (candidates.length > 0) {
    com = Utils.int64Compare(stake, candidates[candidates.length - 1][1]);
  }

  if (candidates.length >= maxSize && com <= 0) {
    return;
  }

  rewardDistribution();

  let addition = [address, stake];
  if (roleType === role.VALIDATOR) {
    let node = candidates.find(function(x) {
      return x[2] === proposal.node;
    });
    Utils.assert(node === undefined, proposal.node + ' has already been applied.');
    addition.push(proposal.node);
  }

  let size = candidates.push(addition);
  let found = candidates[size - 1];
  let dist = roleType === role.VALIDATOR ? elect.valDist: elect.kolDist;
  if (dist[address] === undefined) {
    dist[address] = ['0', proposal.rewardPool, proposal.rewardRatio];
    distributed = true;
  }
  Chain.tlog('addCandidate', address, roleType);

  candidates.sort(doubleSort);
  if (candidates.length > maxSize) {
    candidates = candidates.slice(0, maxSize);
  }

  let key = roleType === role.VALIDATOR ? valCandsKey: kolCandsKey;
  saveObj(key, candidates);

  // if(roleType === role.VALIDATOR && candidates.indexOf(found) < cfg.validator_size){
  //     updateValidators(candidates);
  // }
}

function deleteCandidate(roleType, address) {
  let candidates = roleType === role.VALIDATOR ? elect.valCands: elect.kolCands;
  let found = candidates.find(function(x) {
    return x[0] === address;
  });
  if (found === undefined) {
    return;
  }

  rewardDistribution();

  let index = candidates.indexOf(found);
  candidates.splice(index, 1);
  candidates.sort(doubleSort);
  Chain.tlog('deleteCandidate', address, roleType);

  let key = roleType === role.VALIDATOR ? valCandsKey: kolCandsKey;
  saveObj(key, candidates);

  if (roleType === role.VALIDATOR) {
    updateValidators(false, found[2]);
  }
}

function updateStake(roleType, candidate, formalSize, amount) {
  let candidates = roleType === role.VALIDATOR ? elect.valCands: elect.kolCands;

  let oldPos = candidates.indexOf(candidate);
  candidate[1] = Utils.int64Add(candidate[1], amount);
  candidates.sort(doubleSort);
  let newPos = candidates.indexOf(candidate);

  let key = roleType === role.VALIDATOR ? valCandsKey: kolCandsKey;
  saveObj(key, candidates);

  if ((oldPos >= formalSize && newPos < formalSize) || (oldPos < formalSize && newPos >= formalSize)) {
    rewardDistribution();

    // if(roleType === role.VALIDATOR){
    //     updateValidators(candidates);
    // }
  }
}

function roleValid(roleType) {
  return roleType === role.COMMITTEE || roleType === role.VALIDATOR || roleType === role.KOL;
}

function apply(roleType, pool, ratio, node) {
  Utils.assert(roleValid(roleType), 'Unknown role:' + roleType + '.');

  let key = proposalKey(motion.APPLY, roleType, Chain.msg.sender);
  let proposal = loadObj(key);
  Utils.assert(proposal === false, Chain.msg.sender + ' has applied to become a ' + roleType + '.');

  checkPledge(roleType);
  if (roleType === role.COMMITTEE) {
    proposal = applicationProposal(roleType);
  } else if (roleType === role.KOL) {
    proposal = applicationProposal(roleType, pool || Chain.msg.sender, ratio || 0);
  } else {
    proposal = applicationProposal(roleType, pool || Chain.msg.sender, ratio || 0, node || Chain.msg.sender);
  }

  saveObj(key, proposal);
}

function append(roleType) {
  Utils.assert(roleValid(roleType), 'Unknown role:' + roleType + '.');

  let key = proposalKey(motion.APPLY, roleType, Chain.msg.sender);
  let proposal = loadObj(key);

  Utils.assert(proposal !== false, Chain.msg.sender + ' has not yet applied to become a ' + roleType + '.');
  Utils.assert(Chain.block.timestamp < proposal.expiration || proposal.passTime !== undefined, 'Application has expired.');
  Utils.assert(Utils.int64Mod(Chain.msg.coinAmount, cfg.vote_unit) === '0', 'The amount of additional pledge must be an integer multiple of ' + cfg.vote_unit + '.');

  proposal.pledge = Utils.int64Add(proposal.pledge, Chain.msg.coinAmount);
  saveObj(key, proposal);
  if (proposal.passTime === undefined) {
    /* Additional deposit, not yet approved */
    return true;
  }

  /* Approved, additional deposit */
  Utils.assert(roleType === role.VALIDATOR || roleType === role.KOL, 'Only the validator and KOL can add a deposit.');

  electInit();
  let candidates = roleType === role.VALIDATOR ? elect.valCands: elect.kolCands;
  let found = candidates.find(function(x) {
    return x[0] === Chain.msg.sender;
  });

  if (found === undefined) {
    let maxSize = roleType === role.VALIDATOR ? cfg.validator_candidate_size: cfg.kol_candidate_size;
    addCandidates(roleType, Chain.msg.sender, proposal, maxSize);
  } else {
    let formalSize = roleType === role.VALIDATOR ? cfg.validator_size: cfg.kol_size;
    let stake = Utils.int64Mul(Chain.msg.coinAmount, cfg.pledge_magnification);
    updateStake(roleType, found, formalSize, stake);
  }
}

function penaltyKey(evil, roleType) {
  return 'penalty_' + roleType + '_' + evil;
}

function penalty(evil, roleType) {
  let key = proposalKey(motion.APPLY, roleType, evil);
  let proposal = loadObj(key);

  if (proposal === false) {
    key = proposalKey(motion.WITHDRAW, roleType, evil);
    proposal = loadObj(key);
  }

  Utils.assert(proposal !== false, 'Failed to get ' + key + ' from metadata.');

  Chain.del(key);
  Chain.store(penaltyKey(evil, roleType), proposal.pledge);
  Chain.tlog('penalty', evil, roleType, proposal.pledge);
}

function updateCfg(key, proposal, item) {
  Chain.del(key);
  cfg[item] = proposal.value;

  // validator_rotate_node_count <= validator_size
  if (item === 'validator_size' && cfg.validator_rotate_node_count > cfg[item]) {
    cfg.validator_rotate_node_count = cfg[item];
  }

  saveObj(configKey, cfg);

  if (feeCfg[item] !== undefined) {
    let sys = {};
    sys[feeCfg[item]] = proposal.value;
    Chain.configFee(JSON.stringify(sys));
  }

  Chain.tlog('updateConfigure', key, item);
}

function passIn(committee, key, proposal, item, address) {
  proposal.passTime = Chain.block.timestamp;
  saveObj(key, proposal);

  if (item === role.COMMITTEE) {
    if (committee.length < cfg.committee_size) {
      committee.push(address);
      saveObj(committeeKey, committee);
    }
  } else {
    electInit();
    let maxSize = item === role.VALIDATOR ? cfg.validator_candidate_size: cfg.kol_candidate_size;
    addCandidates(item, address, proposal, maxSize);
  }
}

function passOut(committee, key, item, address) {
  Chain.del(key);

  if (item === role.COMMITTEE) {
    Utils.assert(committee.includes(address), 'There is no ' + address + ' in the committee.');
    committee.splice(committee.indexOf(address), 1);
    saveObj(committeeKey, committee);
  } else {
    electInit();
    deleteCandidate(item, address);
    penalty(address, item);
  }
}

function operateValid(operate) {
  return operate === motion.APPLY || operate === motion.ABOLISH || operate === motion.CONFIG;
}

function refundInput() {
  return JSON.stringify({
    'method': 'refund'
  });
}

function approve(operate, item, address) {
  Utils.assert(operateValid(operate), 'Unknown proposal operation:' + operate + '.');
  Utils.assert(roleValid(item) || cfg[item] !== undefined, 'Unknown proposal item:' + item + '.');
  Utils.assert(Utils.addressCheck(address), 'Invalid address:' + address + '.');

  let committee = loadObj(committeeKey);
  Utils.assert(committee !== false, 'Failed to get ' + committeeKey + ' from metadata.');
  Utils.assert(committee.includes(Chain.msg.sender), 'Only committee members have the right to approve.');

  let key = proposalKey(operate, item, address);
  let proposal = loadObj(key);
  Utils.assert(proposal !== false, 'Failed to get ' + key + ' from metadata.');
  Utils.assert(proposal.passTime === undefined, 'The ' + key + ' proposal has been approved.');

  if (Chain.block.timestamp >= proposal.expiration) {
    Utils.assert(false, 'The proposal is expired.');
    //return 'The proposal is expired.';
  }

  Utils.assert(proposal.ballot.includes(Chain.msg.sender) !== true, Chain.msg.sender + ' has voted.');
  proposal.ballot.push(Chain.msg.sender);

  if (proposal.ballot.length <= parseInt(committee.length * cfg.pass_rate)) {
    return saveObj(key, proposal);
  }

  if (operate === motion.CONFIG) {
    updateCfg(key, proposal, item);
  } else if (operate === motion.APPLY) {
    passIn(committee, key, proposal, item, address);
  } else if (operate === motion.ABOLISH) {
    passOut(committee, key, item, address);
  }
}

function voterKey(roleType, candidate, voter) {
  let addr = voter || Chain.msg.sender;
  return 'voter_' + addr + '_' + roleType + '_' + candidate;
}

function vote(roleType, address) {
  Utils.assert(roleType === role.VALIDATOR || roleType === role.KOL, 'Illegal role:' + roleType + '.');
  Utils.assert(Utils.addressCheck(address), 'Invalid address:' + address + '.');
  Utils.assert(Utils.int64Mod(Chain.msg.coinAmount, cfg.vote_unit) === '0', 'The number of votes must be an integer multiple of ' + cfg.vote_unit + '.');

  let key = voterKey(roleType, address);
  let voteAmount = Chain.load(key);

  if (voteAmount === false) {
    voteAmount = Chain.msg.coinAmount;
  } else {
    voteAmount = Utils.int64Add(voteAmount, Chain.msg.coinAmount);
  }

  Chain.store(key, voteAmount);

  electInit();
  let candidates = roleType === role.VALIDATOR ? elect.valCands: elect.kolCands;
  let found = candidates.find(function(x) {
    return x[0] === address;
  });

  Utils.assert(found !== undefined, address + ' is not a validator candidate or KOL candidate.');
  let formalSize = roleType === role.VALIDATOR ? cfg.validator_size: cfg.kol_size;
  updateStake(roleType, found, formalSize, Chain.msg.coinAmount);
}

function unVote(roleType, address) {
  Utils.assert(roleType === role.VALIDATOR || roleType === role.KOL, 'Illegal role:' + roleType + '.');
  Utils.assert(Utils.addressCheck(address), 'Invalid address:' + address + '.');

  let key = voterKey(roleType, address);
  let amount = Chain.load(key);
  Utils.assert(amount !== false, 'The account: ' + Chain.msg.sender + ' has not voted for: ' + address + '.');

  Chain.del(key);
  transferCoin(Chain.msg.sender, amount, '', 'unVote');

  electInit();
  let candidates = roleType === role.VALIDATOR ? elect.valCands: elect.kolCands;
  let found = candidates.find(function(x) {
    return x[0] === address;
  });
  if (found === undefined) {
    return true;
  }

  let formalSize = roleType === role.VALIDATOR ? cfg.validator_size: cfg.kol_size;
  updateStake(roleType, found, formalSize, '-' + amount);
}

function abolitionProposal(roleType, proof) {
  let proposal = {
    'informer': Chain.msg.sender,
    'reason': proof,
    'expiration': Chain.block.timestamp + cfg.valid_period,
    'ballot': []
  };

  if (roleType === role.COMMITTEE) {
    proposal.ballot.push(Chain.msg.sender);
  }

  return proposal;
}

function isExist(twoDimenList, address) {
  let element = twoDimenList.find(function(x) {
    return x[0] === address;
  });

  return element !== undefined;
}

function reportPermission(roleType) {
  if (roleType === role.COMMITTEE) {
    let committee = loadObj(committeeKey);
    Utils.assert(committee !== false, 'Failed to get ' + committeeKey + ' from metadata.');
    Utils.assert(committee.includes(Chain.msg.sender), 'Only committee members have the right to report illegal practices.');
  } else if (roleType === role.VALIDATOR) {
    let valCands = loadObj(valCandsKey);
    Utils.assert(valCands !== false, 'Failed to get ' + valCandsKey + ' from metadata.');

    let validators = valCands.slice(0, cfg.validator_size);
    Utils.assert(isExist(validators, Chain.msg.sender), 'Only validators have the right to report illegal practices.');
  } else if (roleType === role.KOL) {
    let kolCands = loadObj(kolCandsKey);
    Utils.assert(kolCands !== false, 'Failed to get ' + kolCandsKey + ' from metadata.');

    let kols = kolCands.slice(0, cfg.kol_size);
    Utils.assert(isExist(kols, Chain.msg.sender), 'Only KOLs have the right to report illegal practices.');
  } else {
    throw 'Unkown role:' + roleType + '.';
  }

  return true;
}

function abolish(roleType, address, proof) {
  reportPermission(roleType);
  Utils.assert(Utils.addressCheck(address), 'Invalid address:' + address + '.');
  Utils.assert(typeof proof === 'string', 'Proof must be a string.');

  let applyKey = proposalKey(motion.APPLY, roleType, address);
  let applyProposal = loadObj(applyKey);
  Utils.assert(applyProposal.passTime !== undefined, address + ' can not be abolished.');

  let key = proposalKey(motion.ABOLISH, roleType, address);
  let proposal = loadObj(key);

  if (proposal === false) {
    proposal = abolitionProposal(roleType, proof || 'none');
    saveObj(key, proposal);
  }

  proposal.expiration = Chain.block.timestamp + cfg.valid_period;
  saveObj(key, proposal);
}

function exitProposal(exiter, pledge) {
  let proposal = {
    'exiter': exiter,
    'pledge': pledge,
    'expiration': Chain.block.timestamp + cfg.valid_period
  };

  return proposal;
}

function withdraw(roleType) {
  Utils.assert(roleValid(roleType), 'Unknown role:' + roleType + '.');

  if (roleType === role.COMMITTEE) {
    let committee = loadObj(committeeKey);
    Utils.assert(committee !== false, 'Failed to get ' + committeeKey + ' from metadata.');
    Utils.assert(committee.includes(Chain.msg.sender), 'There is no ' + Chain.msg.sender + ' in the committee.');
    Utils.assert(committee.length >= 2, 'Inadequate committee members.');

    let applyKey = proposalKey(motion.APPLY, roleType, Chain.msg.sender);
    Chain.del(applyKey);
    committee.splice(committee.indexOf(Chain.msg.sender), 1);
    return saveObj(committeeKey, committee);
  }

  let exitKey = proposalKey(motion.WITHDRAW, roleType, Chain.msg.sender);
  let exitInfo = loadObj(exitKey);
  if (exitInfo === false) {
    let applicantKey = proposalKey(motion.APPLY, roleType, Chain.msg.sender);
    let applicant = loadObj(applicantKey);
    Utils.assert(applicant !== false, 'Failed to get ' + applicantKey + ' from metadata.');

    Chain.del(applicantKey);
    if (applicant.passTime === undefined) {
      return transferCoin(Chain.msg.sender, applicant.pledge, refundInput(), 'refund');
    }

    electInit();
    deleteCandidate(roleType, Chain.msg.sender);
    return saveObj(exitKey, exitProposal(Chain.msg.sender, applicant.pledge));
  }

  Utils.assert(Chain.block.timestamp >= exitInfo.expiration, 'Buffer period is not finished.');

  Chain.del(exitKey);
  transferCoin(Chain.msg.sender, exitInfo.pledge, refundInput(), 'refund');
}

function configProposal(item, value) {
  let proposal = {
    'item': item,
    'value': value,
    'expiration': Chain.block.timestamp + cfg.valid_period,
    'ballot': [Chain.msg.sender]
  };

  return proposal;
}

function cfgValid(item, value) {
  Utils.assert(cfg[item] !== undefined, 'Unknown configuration item:' + item + '.');

  if (item === 'reward_allocation_share') {
    return Utils.assert(value[0] + value[1] + value[2] + value[3] === 100, 'Reward allocation is invalid.');
  }

  if (item === 'logic_contract') {
    return Utils.assert(Utils.addressCheck(value), 'Invalid address:' + value + '.');
  }

  if (item === 'validator_freeze_account') {
    Utils.assert(value.length > 0 && value.length <= 100, 'Invalid address list.');
    let i;
    let addr = {};
    for (i = 0; i < value.length; i += 1) {
      Utils.assert(Utils.addressCheck(value[i]), 'Invalid address:' + value[i] + '.');
      Utils.assert(addr[value[i]] === undefined, 'Duplicate address:' + value[i] + '.');
      addr[value[i]] = true;
    }
    return;
  }
  if (item === 'validator_slice_block_count') {
    return Utils.assert(typeof value === 'number' && value >= 0 && value <= 9999999, 'Illegal configuration value: ' + value + '.');
  }
  if (item === 'validator_rand_seed') {
    return Utils.assert(typeof value === 'number' && value >= 0 && value <= 999999, 'Illegal configuration value: ' + value + '.');
  }
  if (item === 'validator_rotate_node_count') {
    return Utils.assert(typeof value === 'number' && value > 0 && value <= cfg.validator_size, 'Illegal configuration value: ' + value + '.');
  }
  if (item === 'monitor_contract') {
    return Utils.assert(typeof value === 'string' && Utils.addressCheck(value), 'Illegal configuration value: ' + value + '.');
  }
  if (item === 'monitor_rate') {
    return Utils.assert(typeof value === 'number' && value >= 0 && value <= 100, 'Illegal configuration value: ' + value + '.');
  }

  Utils.assert(typeof value === 'number' && value > 0, 'Illegal configuration value: ' + value + '.');

  if (item === 'pass_rate') {
    Utils.assert(value <= 1, 'Invalid passing rate: ' + value + '.');
  } else {
    Utils.assert(Number.isInteger(value), 'Illegal configuration value: ' + value + '.');
  }
}

function configure(item, value) {
  cfgValid(item, value);

  let committee = loadObj(committeeKey);
  Utils.assert(committee !== false, 'Failed to get ' + committeeKey + ' from metadata.');
  Utils.assert(committee.includes(Chain.msg.sender), 'Only the committee has the right to propose to modify the configuration.');

  let key = proposalKey(motion.CONFIG, item, Chain.msg.sender);
  let proposal = loadObj(key);
  if (proposal !== false && proposal.value === value) {
    return;
  }

  proposal = configProposal(item, value);
  saveObj(key, proposal);
}

function setNodeAddress(address) {
  nodeAddressValid(address);

  let key = proposalKey(motion.APPLY, role.VALIDATOR, Chain.msg.sender);
  let proposal = loadObj(key);
  Utils.assert(proposal !== false, Chain.msg.sender + ' has not applied to become a validator.');

  proposal.node = address;
  saveObj(key, proposal);

  let candidates = loadObj(valCandsKey);
  Utils.assert(candidates !== false, 'Failed to get ' + valCandsKey + ' from metadata.');

  let found = candidates.find(function(x) {
    return x[0] === Chain.msg.sender;
  });
  if (found === undefined) {
    return false;
  }

  let addressOld = found[2];
  found[2] = address;
  saveObj(valCandsKey, candidates);

  updateValidators(false, addressOld);
  // if(candidates.indexOf(found) < cfg.validator_size){
  //     updateValidators(candidates);
  // }
}

function setVoteDividend(roleType, pool, ratio) {
  Utils.assert(roleValid(roleType), 'Unknown role:' + roleType + '.');

  let key = proposalKey(motion.APPLY, roleType, Chain.msg.sender);
  let proposal = loadObj(key);
  Utils.assert(proposal !== false, 'Failed to get ' + key + ' from metadata.');

  let rewardKey = roleType === role.VALIDATOR ? valRewardKey: kolRewardKey;
  let dist = loadObj(rewardKey);
  Utils.assert(dist !== false, 'Failed to get ' + rewardKey + ' from metadata.');

  if (pool !== undefined) {
    Utils.assert(Utils.addressCheck(pool), 'Invalid address:' + pool + '.');
    proposal.rewardPool = pool;

    if (dist[Chain.msg.sender] !== undefined) {
      dist[Chain.msg.sender][1] = pool;
    }
  }

  if (ratio !== undefined) {
    Utils.assert(Number.isInteger(ratio) && 0 <= ratio && ratio <= 100, 'Invalid vote reward ratio:' + ratio + '.');
    proposal.rewardRatio = ratio;

    if (dist[Chain.msg.sender] !== undefined) {
      dist[Chain.msg.sender][2] = ratio;
    }
  }

  saveObj(key, proposal);
  saveObj(rewardKey, dist);
}

function clean(operate, item, address) {
  Utils.assert(operateValid(operate) || operate === motion.WITHDRAW, 'Unknown proposal operation:' + operate + '.');
  Utils.assert(roleValid(item) || cfg[item] !== undefined, 'Unknown proposal item:' + item + '.');
  Utils.assert(Utils.addressCheck(address), 'Invalid address:' + address + '.');

  let key = proposalKey(operate, item, address);
  let proposal = loadObj(key);
  Utils.assert(proposal !== false, 'Failed to get ' + key + ' from metadata.');
  Utils.assert(Chain.block.timestamp >= proposal.expiration && proposal.passTime === undefined, 'The proposal is still valid.');

  Chain.del(key);
  /*operate === motion.APPLY || operate === motion.WITHDRAW*/
  if (proposal.pledge > 0) {
    transferCoin(address, proposal.pledge, refundInput(), 'refund');
  }
}

function calculateReward() {
  //cfg = loadObj(configKey);
  Utils.assert(cfg !== false, 'Failed to get ' + configKey + ' from metadata.');

  elect.allStake = loadObj(stakeKey);
  Utils.assert(elect.allStake !== false, 'Failed to get ' + stakeKey + ' from metadata.');

  electInit();
  let reward = Utils.int64Sub(elect.balance, elect.allStake);
  if (reward !== '0') {
    calculate(reward);
  }

  return {
    'validators': elect.valDist,
    'kols': elect.kolDist
  };
}

function kolList() {
  //cfg = loadObj(configKey);
  Utils.assert(cfg !== false, 'Failed to get ' + configKey + ' from metadata.');

  let kolCands = loadObj(kolCandsKey);
  Utils.assert(kolCands !== false, 'Failed to get ' + kolCandsKey + ' from metadata.');

  return kolCands.slice(0, cfg.kol_size);
}

function query(input_str) {
  let input = JSON.parse(input_str);
  let params = input.params;

  cfg = loadObj(configKey);
  Utils.assert(cfg !== false, 'Failed to get ' + configKey + ' from metadata.');

  let result = {};
  if (input.method === 'getProposal') {
    let pKey = proposalKey(params.operate, params.item, params.address);
    result.proposal = loadObj(pKey);
  } else if (input.method === 'getVoteInfo') {
    let vKey = voterKey(params.role, params.candidate, params.voter);
    result.voterInfo = loadObj(vKey);
  } else if (input.method === 'getValidators') {
    result.validators = validatorsList();
  } else if (input.method === 'getValidatorCandidates') {
    result.validator_candidates = loadObj(valCandsKey);
  } else if (input.method === 'getKols') {
    result.kols = kolList();
  } else if (input.method === 'getKolCandidates') {
    result.kol_candidates = loadObj(kolCandsKey);
  } else if (input.method === 'getCommittee') {
    result.committee = loadObj(committeeKey);
  } else if (input.method === 'getRewardDistribute') {
    result.rewards = calculateReward();
  } else if (input.method === 'getConfiguration') {
    result.configuration = loadObj(configKey);
  } else if (input.method === 'getFreeze') {
    result.freeze = loadObj(freezeKey);
    if (result.freeze === false) {
      result.freeze = [];
    }
  } else {
    throw 'Unknown operating: ' + input.method + '.';
  }

  return JSON.stringify(result);
}

function prepare() {
  cfg = loadObj(configKey);
  Utils.assert(cfg !== false, 'Failed to get ' + configKey + ' from metadata.');

  elect.allStake = loadObj(stakeKey);
  Utils.assert(elect.allStake !== false, 'Failed to get ' + stakeKey + ' from metadata.');

  if (Utils.int64Compare(Chain.msg.coinAmount, 0) > 0) {
    elect.allStake = Utils.int64Add(elect.allStake, Chain.msg.coinAmount);
    saveObj(stakeKey, elect.allStake);
  }
}

function initProposal(roleType, pool, ratio, node) {
  let proposal = {
    'pledge': '0',
    'expiration': Chain.block.timestamp + cfg.valid_period,
    'passTime': Chain.block.timestamp + cfg.valid_period,
    'ballot': []
  };

  if (roleType === role.COMMITTEE) {
    return proposal;
  }

  proposal.rewardPool = pool;
  proposal.rewardRatio = ratio;
  proposal.node = node;
  return proposal;
}

function getDefaultConfig(logicContract) {
  return {
    'gas_price': 1,
    /* 1 : gas_price, 1000 */
    'base_reserve': 10,
    /* 2 : base_reserve, 100 0000 */
    'committee_size': 3,
    'kol_size': 21,
    'kol_candidate_size': 10,
    'kol_min_pledge': 3,
    /* 300 0000 0000 0000 */
    'validator_size': 200,
    'validator_candidate_size': 100,
    'validator_min_pledge': 1,
    /* 500 0000 0000 00 */
    'pledge_magnification': 2,
    'pass_rate': 0.66,
    'valid_period': 1800000000,
    /* 30 * 60 * 1000 * 1000 */
    'vote_unit': 1,
    /* 10 0000 0000 */
    'reward_allocation_share': [100, 0, 0, 0],
    /* validators 100%, validator candidates 0%, kols 0%, kol candidates 0% */
    'logic_contract': logicContract,
    'validator_rand_seed': 100,
    /* [0, 999999] */
    'validator_slice_block_count': 2880,
    /* [1, 9999999] 60 * 24 */
    'validator_rotate_node_count': 1,
    /* [1, validator_size] */
    'validator_freeze_account': ["ZTX3cx9ZaSLaGKRWYp4MNJKgLNkP1raDJpJ3X"],
    'monitor_contract': '',
    'monitor_rate': 80
    /* [0, 100] */
  };
}

function initialization(params) {
  cfg = loadObj(configKey);
  Utils.assert(cfg === false, 'Repeated initialization.');

  cfg = getDefaultConfig(params.logic_contract);
  saveObj(configKey, cfg);
  Utils.assert(params.committee.length >= 1 && params.committee.length <= cfg.committee_size, 'Illegal committee size.');

  let i = 0;
  for (i = 0; i < params.committee.length; i += 1) {
    Utils.assert(Utils.addressCheck(params.committee[i]), 'Invalid address:' + params.committee[i] + '.');

    let proposalC = initProposal(role.COMMITTEE);
    saveObj(proposalKey(motion.APPLY, role.COMMITTEE, params.committee[i]), proposalC);
  }
  saveObj(committeeKey, params.committee);

  let validators = Chain.getValidators();
  Utils.assert(validators !== false, 'Failed to get validators.');

  let j = 0;
  let dist = {};
  for (j = 0; j < validators.length; j += 1) {
    let proposalV = initProposal(role.VALIDATOR, validators[j][0], 0, validators[j][0]);
    saveObj(proposalKey(motion.APPLY, role.VALIDATOR, validators[j][0]), proposalV);

    validators[j][2] = validators[j][0];
    dist[validators[j][0]] = ['0', validators[j][0], 0];
  }
  saveObj(valCandsKey, validators.sort(doubleSort));
  saveObj(kolCandsKey, []);
  saveObj(valRewardKey, dist);
  saveObj(kolRewardKey, {});
  saveObj(stakeKey, Chain.msg.coinAmount);
}

function upgradeConfig() {
  let cfgNew = getDefaultConfig();
  let cfgKeySize = Object.keys(cfg).length;
  let i;
  for (i = 0; i < Object.keys(cfgNew).length; i += 1) {
    let key = Object.keys(cfgNew)[i];
    if (cfg.hasOwnProperty(key) === false) {
      cfg[key] = cfgNew[key];
    }
  }
  if (Object.keys(cfg).length > cfgKeySize) {
    saveObj(configKey, cfg);
  }
}

function main(input_str) {
  let input = JSON.parse(input_str);
  let params = input.params;

  // if(input.method === 'init'){
  //      return initialization(params);
  // }

  if (input.method === 'fallback') {
    return;
  }

  prepare();

  if (input.method !== 'apply' && input.method !== 'append' && input.method !== 'vote') {
    Utils.assert(Chain.msg.coinAmount === '0', 'Chain.msg.coinAmount != 0.');
  }

  if (input.method === 'apply') {
    apply(params.role, params.pool, params.ratio, params.node);
  } else if (input.method === 'append') {
    append(params.role);
  } else if (input.method === 'approve') {
    approve(params.operate, params.item, params.address);
  } else if (input.method === 'vote') {
    vote(params.role, params.address);
  } else if (input.method === 'unVote') {
    unVote(params.role, params.address);
  } else if (input.method === 'abolish') {
    abolish(params.role, params.address, params.proof);
  } else if (input.method === 'withdraw') {
    withdraw(params.role);
  } else if (input.method === 'extract') {
    extract();
  } else if (input.method === 'extractTransfer') {
    extractTransfer(params !== undefined ? params.list: params);
  } else if (input.method === 'configure') {
    configure(params.item, params.value);
  } else if (input.method === 'setNodeAddress') {
    setNodeAddress(params.address);
  } else if (input.method === 'setVoteDividend') {
    setVoteDividend(params.role, params.pool, params.ratio);
  } else if (input.method === 'clean') {
    clean(params.operate, params.item, params.address);
  } else if (input.method === 'updateValidator') {
    updateValidators(false);
  } else if (input.method === 'setFreeze') {
    Utils.assert(cfg.validator_freeze_account.includes(Chain.msg.sender) === true, 'Only specific accounts can call.');
    setFreeze(params.validators, params.freeze);
  } else if (input.method === 'upgradeConfig') {
    upgradeConfig();
  } else {
    throw 'Unknown operating: ' + input.method + '.';
  }

  if (distributed) {
    saveObj(kolRewardKey, elect.kolDist);
    saveObj(valRewardKey, elect.valDist);
  }
}

function init(input_str) {
  let input = JSON.parse(input_str);
  initialization(input);
  return true;
}