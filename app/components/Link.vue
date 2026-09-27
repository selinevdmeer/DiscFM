<script setup lang="ts">
type Props = {
  to: string;
};

defineProps<Props>();
</script>

<template>
  <a :href="to">
    <slot />
  </a>
</template>
