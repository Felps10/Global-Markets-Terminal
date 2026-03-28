import { Router } from 'express';
import { supabase } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const VALID_L1_IDS = ['global', 'brasil'];

function validateL1(l1Id, res) {
  if (!VALID_L1_IDS.includes(l1Id)) {
    res.status(400).json({ error: "Invalid l1Id. Must be 'global' or 'brasil'." });
    return false;
  }
  return true;
}

// GET /api/v1/l1 — all L1 nodes
router.get('/', authenticate, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('l1_nodes')
      .select('id, display_name, sort_order')
      .order('sort_order');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/l1/:l1Id/groups — all L2 groups belonging to a given L1
router.get('/:l1Id/groups', authenticate, async (req, res) => {
  const { l1Id } = req.params;
  if (!validateL1(l1Id, res)) return;

  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('l1_id', l1Id)
      .order('sort_order');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/l1/:l1Id/groups/:groupId/subgroups — L3 subgroups for a group, validated against L1
router.get('/:l1Id/groups/:groupId/subgroups', authenticate, async (req, res) => {
  const { l1Id, groupId } = req.params;
  if (!validateL1(l1Id, res)) return;

  try {
    // Confirm the group exists under this L1
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, l1_id')
      .eq('id', groupId)
      .eq('l1_id', l1Id)
      .single();
    if (groupError || !group) {
      return res.status(404).json({ error: 'Group not found under the specified L1.' });
    }

    const { data, error } = await supabase
      .from('subgroups')
      .select('*')
      .eq('group_id', groupId)
      .order('sort_order');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/l1/:l1Id/assets — all assets belonging to a given L1
// Optional query params: ?groupId=  ?subgroupId=
router.get('/:l1Id/assets', authenticate, async (req, res) => {
  const { l1Id } = req.params;
  const { groupId, subgroupId } = req.query;
  if (!validateL1(l1Id, res)) return;

  try {
    let data, error;

    if (groupId) {
      // Verify the group belongs to the requested L1 first
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id')
        .eq('id', groupId)
        .eq('l1_id', l1Id)
        .single();
      if (groupError || !group) {
        return res.status(404).json({ error: 'Group not found under the specified L1.' });
      }

      ({ data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('group_id', groupId)
        .order('sort_order')
        .order('symbol'));

    } else if (subgroupId) {
      // Verify the subgroup's parent group belongs to the requested L1
      const { data: sg, error: sgError } = await supabase
        .from('subgroups')
        .select('id, group_id')
        .eq('id', subgroupId)
        .single();
      if (sgError || !sg) {
        return res.status(404).json({ error: 'Subgroup not found.' });
      }

      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id')
        .eq('id', sg.group_id)
        .eq('l1_id', l1Id)
        .single();
      if (groupError || !group) {
        return res.status(404).json({ error: 'Subgroup does not belong to the specified L1.' });
      }

      ({ data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('subgroup_id', subgroupId)
        .order('sort_order')
        .order('symbol'));

    } else {
      // No filter: fetch all group IDs for this L1, then fetch matching assets
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id')
        .eq('l1_id', l1Id);
      if (groupsError) throw groupsError;

      const groupIds = groups.map((g) => g.id);
      if (groupIds.length === 0) return res.json([]);

      ({ data, error } = await supabase
        .from('assets')
        .select('*')
        .in('group_id', groupIds)
        .order('sort_order')
        .order('symbol'));
    }

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
